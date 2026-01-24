import { inject, injectable } from 'tsyringe';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { ExpressXLogger } from '../logger/logger';

interface ProjectPaths {
  sourceDir: string;
  outDir: string;
  scanPattern?: string;
}

@injectable()
export class Scanner {
  constructor(
    @inject(ExpressXLogger) private logger: ExpressXLogger,
  ) { }

  /**
   * Normalize directory path (remove ./ prefix, trailing slashes)
   */
  private normalizePath(dirPath: string): string {
    return dirPath
      .replace(/^\.\//, '')
      .replace(/\/$/, '')
      .trim();
  }

  /**
   * Parse tsconfig.json safely (handles JSONC - comments and trailing commas)
   */
  private parseTsConfig(tsconfigPath: string): any {
    try {
      const content = fs.readFileSync(tsconfigPath, 'utf-8');
      let cleaned = content
        .replace(/\/\/.*/g, '')           // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/,(\s*[}\]])/g, '$1');   // Remove trailing commas

      return JSON.parse(cleaned);
    } catch (err: any) {
      this.logger.warn(`⚠️  Could not parse tsconfig.json: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Get project paths with priority: package.json → tsconfig.json → defaults
   */
  private getProjectPaths(): ProjectPaths {
    const cwd = process.cwd();
    let sourceDir = 'src';
    let outDir = 'dist';
    let scanPattern: string | undefined;

    // PRIORITY 1: Check package.json for framework-specific config
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

        if (pkg.expressx) {
          if (pkg.expressx.sourceDir) {
            sourceDir = this.normalizePath(pkg.expressx.sourceDir);
            this.logger.info(`📦 Using sourceDir from package.json: ${sourceDir}`);
          }
          if (pkg.expressx.outDir) {
            outDir = this.normalizePath(pkg.expressx.outDir);
            this.logger.info(`📦 Using outDir from package.json: ${outDir}`);
          }
          if (pkg.expressx.scanPattern) {
            scanPattern = pkg.expressx.scanPattern;
            this.logger.info(`📦 Using custom scanPattern from package.json`);
          }

          // If package.json has config, don't check tsconfig
          if (pkg.expressx.sourceDir && pkg.expressx.outDir) {
            return { sourceDir, outDir, scanPattern };
          }
        }
      } catch (err: any) {
        this.logger.warn(`⚠️  Could not parse package.json: ${err.message}`);
      }
    }

    // PRIORITY 2: Check tsconfig.json
    const tsconfigPath = path.join(cwd, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = this.parseTsConfig(tsconfigPath);

      if (tsconfig?.compilerOptions) {
        if (tsconfig.compilerOptions.rootDir) {
          sourceDir = this.normalizePath(tsconfig.compilerOptions.rootDir);
          this.logger.info(`⚙️  Using rootDir from tsconfig.json: ${sourceDir}`);
        } else if (tsconfig.compilerOptions.baseUrl) {
          sourceDir = this.normalizePath(tsconfig.compilerOptions.baseUrl);
          this.logger.info(`⚙️  Using baseUrl from tsconfig.json: ${sourceDir}`);
        }

        if (tsconfig.compilerOptions.outDir) {
          outDir = this.normalizePath(tsconfig.compilerOptions.outDir);
          this.logger.info(`⚙️  Using outDir from tsconfig.json: ${outDir}`);
        }
      }
    }

    // PRIORITY 3: Defaults (already set above)
    if (sourceDir === 'src' && outDir === 'dist') {
      this.logger.info(`🔧 Using default paths: src → dist`);
    }

    return { sourceDir, outDir, scanPattern };
  }

  public async scanProject(): Promise<void> {
    const isDevMode = process.env.EXPRESSX_RUNTIME === 'ts';
    const { sourceDir, outDir, scanPattern } = this.getProjectPaths();

    const rootDir = isDevMode
      ? path.join(process.cwd(), sourceDir)
      : path.join(process.cwd(), outDir);

    // Verify directory exists
    if (!fs.existsSync(rootDir)) {
      const errorMsg = isDevMode
        ? `Source directory "${sourceDir}" not found. Check your package.json (expressx.sourceDir) or tsconfig.json (rootDir).`
        : `Build directory "${outDir}" not found. Did you run the build command?`;

      throw new Error(`❌ ${errorMsg}\n   Expected: ${rootDir}`);
    }

    // Use custom pattern or default
    const extension = isDevMode ? 'ts' : 'js';
    const pattern = scanPattern ||
      `**/+(*application*|*controller*|*interceptor*|*middleware*).${extension}`;

    this.logger.info(`📂 Scanning: ${rootDir}`);
    this.logger.info(`🔎 Pattern: ${pattern}`);

    console.time('🚀 Discovery Time');

    const files = await glob(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts']
    });

    if (files.length === 0) {
      this.logger.warn(
        `⚠️  No files found matching pattern in ${rootDir}\n` +
        `   Pattern: ${pattern}`
      );
    } else {
      this.logger.info(`✅ Found ${files.length} file(s)`);
    }

    await Promise.all(
      files.map(async (file) => {
        try {
          if (isDevMode) {
            this.logger.info(`🔍 ${path.relative(process.cwd(), file)}`);
            require(file);
          } else {
            this.logger.info(`🔍 ${path.relative(process.cwd(), file)}`);
            await import(pathToFileURL(file).href);
          }
        } catch (err) {
          console.error(`❌ Failed to import ${file}:`, err);
          throw err;
        }
      })
    );

    console.timeEnd('🚀 Discovery Time');
  }
}


// package.json
// {
//   "expressx": {
//     "sourceDir": "src",
//     "outDir": "dist",
//     "scanPattern": "**/*.(route|handler|guard).ts"
//   }
// }