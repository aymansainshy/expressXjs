import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import { logger } from '../logger/logger';
import { pathToFileURL } from 'url';

// ============================================
// CORE SCANNER
// ============================================

export interface ScanConfig {
  sourceDir: string;
  outDir: string;
}

export interface CachedFileMetadata {
  path: string;
  mtime: number;
  size: number;
  hash?: string; // MD5 or xxHash of decorator lines only
}

export interface FileCache {
  version: string;
  decoratorFiles: CachedFileMetadata[];
  totalScanned: number;
  generatedAt: string;
  environment: 'development' | 'production';
}

export class ExpressXScanner {
  constructor() {}

  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly DECORATORS = [
    'UseGlobalInterceptor',
    'UseGlobalExceptionHandler',
    'Application',
    'Controller',
  ];

  private static isTypeScriptRuntime(): boolean {
    const runtime = process.env.EXPRESSX_RUNTIME?.trim().toLowerCase();

    if (runtime === 'ts') return true;
    if (runtime === 'js') return false;

    return process.env.NODE_ENV?.trim().toLowerCase() === 'development';
  }

  /**
   * Get configuration from package.json
   */
  static getConfig(): ScanConfig {
    const pkgPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(pkgPath)) {
      throw new Error(
        `ExpressX scanner could not find package.json in "${process.cwd()}". ` +
          'Run the application from the project root.',
      );
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    if (!pkg.expressx?.sourceDir) {
      throw new Error(
        'ExpressX scanner cannot start because package.json does not define the required "expressx.sourceDir" setting.\n\n' +
          'Add an ExpressX configuration similar to:\n' +
          '{\n' +
          '  "expressx": {\n' +
          '    "sourceDir": "src",\n' +
          '    "outDir": "dist",\n' +
          '    "main": "src/index.ts"\n' +
          '  }\n' +
          '}',
      );
    }

    return {
      sourceDir: pkg.expressx.sourceDir,
      outDir: pkg.expressx.outDir || 'dist',
    };
  }

  /**
   * Get cache file path based on environment
   */
  private static getCachePath(isDevMode: boolean): string {
    const config = this.getConfig();
    const dir = isDevMode ? config.sourceDir : config.outDir;
    return path.join(process.cwd(), dir, '.expressx', 'cache.json');
  }

  /**
   * Load cache from disk
   */
  static loadCache(isDevMode: boolean): FileCache | null {
    const cachePath = this.getCachePath(isDevMode);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const cache: FileCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

      // Validate cache version
      if (cache.version !== this.CACHE_VERSION) {
        logger.warn(
          `Cache version mismatch (found ${cache.version}, expected ${this.CACHE_VERSION}) - will regenerate`,
          '.expressx/cache.json',
        );
        return null;
      }

      return cache as FileCache;
    } catch (err) {
      logger.warn(`Failed to read cache: ${(err as Error).message}`, '.expressx/cache.json');
      return null;
    }
  }

  /**
   * Save cache to disk
   */
  static saveCache(cache: FileCache, isDevMode: boolean): void {
    const cachePath = this.getCachePath(isDevMode);
    const cacheDir = path.dirname(cachePath);

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, {
        recursive: true,
      });
    }

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }

  /**
   * Check if file contains ExpressX decorators (fast string search)
   */
  private static hasDecorators(filePath: string, isDevMode: boolean): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // 1. Quick check for the package import
      // This matches:
      // @expressxjs/core
      // @expressxjs/core/
      // @expressxjs/core/decorators
      // @expressxjs/core/any/other/path
      // const importPattern = /@expressx\/core(\/[a-zA-Z0-9\-_]*)*/;

      // if (!importPattern.test(content)) {
      //   return false;
      // }

      // 2. Create a regex to match:
      // @             - The literal '@' symbol
      // (Name1|Name2) - Any of your decorator names
      // (?\s*\(.*?\))? - Optional: parentheses with any content inside
      let decoratorPattern;
      if (isDevMode) {
        decoratorPattern = new RegExp(`@(${this.DECORATORS.join('|')})\\b(\\s*\\([\\s\\S]*?\\))?`, 'm');
      } else {
        // Compliled TS code doesn't has @ in decorator
        decoratorPattern = new RegExp(`(@)?(${this.DECORATORS.join('|')})\\b(\\s*\\([\\s\\S]*?\\))?`, 'm');
      }

      return decoratorPattern.test(content);
    } catch {
      return false;
    }
  }

  /**
   * Perform full project scan
   */
  static async fullScan(isDevMode: boolean): Promise<FileCache> {
    const startTime = Date.now();
    const config = this.getConfig();
    const extension = isDevMode ? 'ts' : 'js';
    const rootDir = isDevMode ? path.join(process.cwd(), config.sourceDir) : path.join(process.cwd(), config.outDir);

    if (!fs.existsSync(rootDir)) {
      const directoryType = isDevMode ? 'source' : 'build';
      const configKey = isDevMode ? 'sourceDir' : 'outDir';
      const nextStep = isDevMode
        ? `Verify "expressx.${configKey}" in package.json.`
        : `Verify "expressx.${configKey}" in package.json and build the application before starting it.`;

      throw new Error(
        `ExpressX scanner could not find the configured ${directoryType} directory: "${rootDir}".\n` +
          `Expected to scan ${isDevMode ? 'TypeScript source' : 'compiled JavaScript'} files in this directory. ${nextStep}`,
      );
    }

    logger.info(`Start Scanning directory: ${rootDir}`, 'Scanning');

    // Get all source files
    const allFiles = await glob(`**/*.${extension}`, {
      cwd: rootDir,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/dist/**',
        '**/build/**',
        '**/.expressx/**',
        '**/.git/**',
      ],
    });

    logger.info(`Total files found: ${allFiles.length.toLocaleString()}`, 'Scanning');
    logger.info(`Start Filtering decorator files...`, 'Scanning');

    // Filter files containing decorators
    const decoratorFiles: CachedFileMetadata[] = [];
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < allFiles.length; i += CHUNK_SIZE) {
      const chunk = allFiles.slice(i, i + CHUNK_SIZE);

      for (const file of chunk) {
        if (this.hasDecorators(file, isDevMode)) {
          const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');

          try {
            const stats = fs.statSync(file);
            decoratorFiles.push({
              path: relativePath,
              mtime: stats.mtimeMs,
              size: stats.size,
            });
          } catch {
            // File deleted between scan and stat
          }
        }
      }

      const progress = Math.min(((i + CHUNK_SIZE) / allFiles.length) * 100, 100);
      logger.info(
        `Progress: ${progress.toFixed(1)}% - ` + `Found: ${decoratorFiles.length} decorator files`,
        'Scanning',
      );
    }

    logger.info(`Scan complete. Found: ${decoratorFiles.length} decorator files`, 'Scanning');

    const scanTime = Date.now() - startTime;

    logger.info(`Scan complete in ${scanTime}ms`, 'Scanning');
    logger.info(`Decorator files: ${decoratorFiles.length}`, 'Scanning');
    logger.info(`Scan efficiency: ${((decoratorFiles.length / allFiles.length) * 100).toFixed(2)}%`, 'Scanning');

    return {
      version: this.CACHE_VERSION,
      decoratorFiles,
      totalScanned: allFiles.length,
      generatedAt: new Date().toISOString(),
      environment: isDevMode ? 'development' : 'production',
    };
  }

  /**
   * Import decorator files from cache
   */
  static async importFromCache(cache: FileCache, isDevMode: boolean): Promise<void> {
    const startTime = Date.now();
    const importedPaths = new Set<string>(); // Prevent circular imports

    for (const cachedFile of cache.decoratorFiles) {
      const absolutePath = path.join(process.cwd(), cachedFile.path);

      // Skip duplicates (prevent circular imports)
      if (importedPaths.has(absolutePath)) {
        logger.warn(`Skipping duplicate.  import: ${absolutePath}`, 'Importing file');
        continue;
      }

      try {
        logger.info(`├─── ${absolutePath}`, 'Importing file');

        if (isDevMode) {
          require(absolutePath);
        } else {
          await import(pathToFileURL(absolutePath).href);
        }

        importedPaths.add(absolutePath);
      } catch (err) {
        logger.error(`Failed to import ${cachedFile.path}: ${(err as Error).message}`, 'Importing file');

        // Detect circular dependencies
        if (err instanceof RangeError && err.message.includes('stack')) {
          throw new Error(
            `Circular dependency detected in: ${absolutePath}\n` +
              'Check your imports for circular references between controllers/services.',
          );
        }

        throw err;
      }
    }

    const importTime = Date.now() - startTime;
    logger.info(`All files imported in ${importTime}ms\n`, 'Importing files');
  }

  static async prefurmScanning() {
    const isDevMode = ExpressXScanner.isTypeScriptRuntime();
    const env = isDevMode ? 'Development' : 'Production';

    logger.info(`Running scan in ${env} mode`, 'Scanning');

    // Load cache
    const cache = ExpressXScanner.loadCache(isDevMode);
    if (cache) {
      logger.success(`.expressx/cache.json loaded successfully`, 'Startup');
      logger.debug(`.expressx/cache.json version: ${cache.version}`, '.expressx/cache.json');
      logger.debug(`Environment: ${cache.environment}`, '.expressx/cache.json');
      logger.debug(`Total files scanned: ${cache.totalScanned.toLocaleString()}`, '.expressx/cache.json');
      logger.debug(`Decorator files: ${cache.decoratorFiles.length}`, '.expressx/cache.json');
      logger.debug(`Generated: ${new Date(cache.generatedAt).toLocaleString()}`, '.expressx/cache.json');

      await ExpressXScanner.importFromCache(cache, isDevMode);
    } else {
      // FALLBACK LOGIC
      if (isDevMode) {
        // Development: Allow fallback scan
        logger.warn('Cache not found - performing full scan ......', 'Scanning');

        const newCache = await ExpressXScanner.fullScan(isDevMode);
        if (!newCache) {
          const config = ExpressXScanner.getConfig();
          const error = new Error(
            'Unable to perform scan\n\n' +
              'The .expressx/cache.json file is required for deployment.\n\n' +
              '═════════════════════════════════════════════════════════════════════\n' +
              'SOLUTION:\n' +
              '═════════════════════════════════════════════════════════════════════\n\n' +
              '1. Update package.json scripts:\n' +
              '   {\n' +
              '     "scripts": {\n' +
              '       "build": "expressx build && tsc"\n' +
              '     }\n' +
              '   }\n\n' +
              '2. Run build command:\n' +
              '   npm run build\n\n' +
              `3. Verify cache exists: \`${config.outDir}/.expressx/cache.json\`\n\n` +
              '4. Deploy entire dist/ folder (including .expressx/)\n\n' +
              '5. If you are in a development environment, set NODE_ENV=development or use the CLI to run the application\n' +
              '═══════════════════════════════════════════════════════════════════\n',
          );
          logger.error(error.message, '.expressx/cache.json');
          throw error;
        }
        ExpressXScanner.saveCache(newCache, isDevMode);
        await ExpressXScanner.importFromCache(newCache, isDevMode);
      } else {
        // Production: STRICT - must have cache
        const config = ExpressXScanner.getConfig();
        const error = new Error(
          '\nPRODUCTION CACHE NOT FOUND!\n\n' +
            'The production .expressx/cache.json file is required for deployment.\n\n' +
            '═══════════════════════════════════════════════════════════════════\n' +
            'SOLUTION:\n' +
            '═══════════════════════════════════════════════════════════════════\n\n' +
            '1. Update package.json scripts:\n' +
            '   {\n' +
            '     "scripts": {\n' +
            '       "build": "expressx build && tsc"\n' +
            '     }\n' +
            '   }\n\n' +
            '2. Run build command:\n' +
            '   npm run build\n\n' +
            `3. Verify cache exists: \`${config.outDir}/.expressx/cache.json\`\n\n` +
            '4. Deploy entire dist/ folder (including .expressx/)\n\n' +
            '5. If you are in a development environment, set NODE_ENV=development or use the CLI to run the application\n' +
            '═══════════════════════════════════════════════════════════════════\n',
        );
        logger.error(error.message, '.expressx/cache.json');
        throw error;
      }
    }
  }
}
