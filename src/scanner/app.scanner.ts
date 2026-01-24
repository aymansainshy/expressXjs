import { inject, injectable } from 'tsyringe';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { ExpressXLogger } from '../logger/logger';

// ============================================
// CORE SCANNER
// ============================================

export interface ScanConfig {
  sourceDir: string;
  outDir: string;
}

export interface FileCache {
  version: string;
  decoratorFiles: string[];
  totalScanned: number;
  generatedAt: string;
  environment: 'development' | 'production';
}

const logger = new ExpressXLogger();

// @injectable()
export class ExpressXScanner {
  constructor() { }

  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly DECORATORS = [
    'Application',
    'Controller',
    'Service',
    'Middleware',
    'Interceptor',
    'Guard',
  ];

  /**
   * Get configuration from package.json
   */
  static getConfig(): ScanConfig {
    const pkgPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(pkgPath)) {
      throw new Error('❌ package.json not found in current directory.');
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    if (!pkg.expressx?.sourceDir) {
      throw new Error(
        '❌ Missing "expressx.sourceDir" in package.json.\n\n' +
        'Add this configuration:\n' +
        '{\n' +
        '  "expressx": {\n' +
        '    "sourceDir": "src"\n' +
        '  }\n' +
        '}'
      );
    }

    return {
      sourceDir: pkg.expressx.sourceDir,
      outDir: pkg.expressx.outDir || 'dist'
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
        console.warn('⚠️  Cache version mismatch, will regenerate');
        return null;
      }

      return cache;
    } catch (err) {
      console.warn('⚠️  Failed to read cache:', (err as Error).message);
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
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }

  /**
   * Check if file contains ExpressX decorators (fast string search)
   */
  // private static hasDecorators(filePath: string): boolean {
  //   try {
  //     const content = fs.readFileSync(filePath, 'utf-8');

  //     // Quick check: must import from @expressx/core
  //     if (!content.includes('@expressx/core')) {
  //       return false;
  //     }

  //     // Check for any decorator
  //     return this.DECORATORS.some(decorator => content.includes(decorator));
  //   } catch {
  //     return false;
  //   }
  // }
  private static hasDecorators(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // 1. Quick check for the package import
      // if (!content.includes('@expressx/core')) {
      //   return false;
      // }

      // 1. Improved check: Match '@expressx/core' followed by any sub-path
      // This looks for things like: from '@expressx/core' or from '@expressx/core/decorators'
      // const hasImport = /@expressx\/core/.test(content);
      // console.log(hasImport)
      // if (!hasImport) return false;

      // 2. Create a regex to match:
      // @             - The literal '@' symbol
      // (Name1|Name2) - Any of your decorator names
      // (?\s*\(.*?\))? - Optional: parentheses with any content inside
      const decoratorPattern = new RegExp(`@(${this.DECORATORS.join('|')})\\b(\\s*\\([\\s\\S]*?\\))?`, 'm');

      console.log(decoratorPattern.test(content))

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
    const rootDir = isDevMode
      ? path.join(process.cwd(), config.sourceDir)
      : path.join(process.cwd(), config.outDir);

    if (!fs.existsSync(rootDir)) {
      throw new Error(
        `❌ Directory not found: ${rootDir}\n` +
        `   ${isDevMode ? 'Source' : 'Build'} directory must exist.`
      );
    }

    console.log(`📂 Scanning directory: ${rootDir}`);
    console.log(`🔍 Looking for: **/*.${extension}\n`);

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
        '**/.git/**'
      ]
    });

    console.log(`📊 Total files found: ${allFiles.length.toLocaleString()}`);
    console.log(`🔎 Filtering decorator files...`);

    // Filter files containing decorators
    const decoratorFiles: string[] = [];
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < allFiles.length; i += CHUNK_SIZE) {
      const chunk = allFiles.slice(i, i + CHUNK_SIZE);
      const found = chunk.filter(file => this.hasDecorators(file));
      decoratorFiles.push(...found);

      // Progress indicator
      const progress = Math.min(((i + CHUNK_SIZE) / allFiles.length) * 100, 100);
      process.stdout.write(
        `\r   Progress: ${progress.toFixed(1)}% - ` +
        `Found ${decoratorFiles.length} decorator files`
      );
    }

    console.log('\n');

    // Convert to relative paths for portability
    const relativePaths = decoratorFiles.map(f =>
      path.relative(process.cwd(), f).replace(/\\/g, '/')
    );

    const scanTime = Date.now() - startTime;

    console.log(`✅ Scan complete in ${scanTime}ms`);
    console.log(`   Decorator files: ${decoratorFiles.length}`);
    console.log(`   Scan efficiency: ${((decoratorFiles.length / allFiles.length) * 100).toFixed(2)}%\n`);

    return {
      version: this.CACHE_VERSION,
      decoratorFiles: relativePaths,
      totalScanned: allFiles.length,
      generatedAt: new Date().toISOString(),
      environment: isDevMode ? 'development' : 'production'
    };
  }

  /**
   * Import decorator files from cache
   */
  static async importFromCache(cache: FileCache, isDevMode: boolean): Promise<void> {
    const startTime = Date.now();

    for (const relativePath of cache.decoratorFiles) {
      const absolutePath = path.join(process.cwd(), relativePath);

      logger.info('Path to Import -------->>>', absolutePath);
      try {
        if (isDevMode) {
          require(absolutePath);
        } else {
          await import(absolutePath);
        }
      } catch (err) {
        console.error(`❌ Failed to import: ${relativePath}`);
        console.error((err as Error).message);
        throw err;
      }
    }

    const importTime = Date.now() - startTime;
    console.log(`   Import time: ${importTime}ms\n`);
  }
}