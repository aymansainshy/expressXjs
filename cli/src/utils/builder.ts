import path from "path";
import { CachedFileMetadata, FileCache } from "../constant/scanInerfaces";
import { ExpressXScanner } from "@expressxjs/core/scanner";
import { logger } from "../constant/logger";

export interface BuildOptions {
  output?: string;
  minify?: boolean;
  sourcemap?: boolean;
  verbose?: boolean;
}

export async function buildCommand(options: BuildOptions = {}): Promise<void> {
  const verbose = options.verbose || false;

  logger.info('Starting ExpressX build preparation', 'Build');

  // Show build options
  if (verbose) {
    logger.debug(
      `Build options - output: ${options.output ?? '(default)'}, ` +
      `minify: ${options.minify ? 'enabled' : 'disabled'}, ` +
      `source maps: ${options.sourcemap ? 'enabled' : 'disabled'}`,
      'Build'
    );
  }

  try {
    const config = ExpressXScanner.getConfig();

    // Override output directory if specified
    const outputDir = options.output || config.outDir;

    // Step 1: Scan source files
    logger.info('Step 1/2: Scanning source files...', 'Build');
    const devCache = await ExpressXScanner.fullScan(true);

    if (verbose) {
      logger.debug(
        `Scanned ${devCache.totalScanned} file(s), found ${devCache.decoratorFiles.length} with decorators`,
        'Build'
      );
    }

    // Save development cache
    ExpressXScanner.saveCache(devCache, true);
    const devCachePath = path.join(config.sourceDir, '.expressx', 'cache.json');
    logger.success(`Development cache saved: ${devCachePath}`, 'Build');

    // Step 2: Generate production cache
    logger.info('Step 2/2: Generating production cache...', 'Build');

    // Convert source paths to compiled paths
    const prodCache: FileCache = {
      version: devCache.version,
      decoratorFiles: devCache.decoratorFiles.map((data: CachedFileMetadata) =>
      ({
        ...data,
        path: data.path
          .replace(config.sourceDir + '/', outputDir + '/')
          .replace(/\.ts$/, '.js')
      })
      ),
      totalScanned: devCache.totalScanned,
      generatedAt: new Date().toISOString(),
      environment: 'production'
    };

    ExpressXScanner.saveCache(prodCache, false);
    const prodCachePath = path.join(outputDir, '.expressx', 'cache.json');

    logger.success(
      `Production cache generated: ${prodCachePath} (${prodCache.decoratorFiles.length} file(s) tracked)`,
      'Build'
    );

    logger.success('Build preparation complete', 'Build');
    logger.info('Next step: run the TypeScript compiler', 'Build');

    if (options.minify || options.sourcemap || options.output) {
      logger.info('Additional options detected. Configure tsconfig.json as follows:', 'Build');
      if (options.output) {
        logger.info(`Set "outDir" to "${outputDir}"`, 'Build');
      }
      if (options.sourcemap) {
        logger.info('Set "sourceMap" to true', 'Build');
      }
      if (options.minify) {
        logger.info('Use a bundler such as esbuild or webpack for minification', 'Build');
      }
    }

    logger.info('Command: tsc', 'Build');
    logger.info(`Include ${outputDir}/.expressx/ in your deployment`, 'Build');

    if (verbose) {
      logger.debug(
        `Build summary - source: ${config.sourceDir}, output: ${outputDir}, ` +
        `cache files: 2 (dev + prod), decorator files: ${prodCache.decoratorFiles.length}`,
        'Build'
      );
    }

  } catch (err) {
    logger.error(`Build failed: ${(err as Error).message}`, 'Build', err as Error);
    process.exit(1);
  }
}
