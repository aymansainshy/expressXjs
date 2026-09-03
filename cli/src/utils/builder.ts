import path from 'node:path';
import { ExpressXScanner, type CachedFileMetadata, type FileCache } from '@expressxjs/core/scanner';
import { logger } from '../constant/logger';

export interface BuildOptions {
  output?: string;
  verbose?: boolean;
}

export async function buildCommand(options: BuildOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false;
  const config = ExpressXScanner.getConfig();
  const outputDir = options.output || config.outDir;
  const productionCachePath = ExpressXScanner.getCachePath(false, outputDir);

  logger.info('Starting ExpressX build preparation', 'Build');
  if (verbose) {
    logger.debug(`Build options - output: ${outputDir}`, 'Build');
  }

  logger.info('Step 1/2: Scanning source files', 'Build');
  const developmentCache = await ExpressXScanner.fullScan(true);
  ExpressXScanner.saveCache(developmentCache, true);
  logger.success(`Development cache saved: ${toProjectRelativePath(ExpressXScanner.getCachePath(true))}`, 'Build');

  logger.info('Step 2/2: Generating production cache', 'Build');
  const productionCache: FileCache = {
    version: developmentCache.version,
    decoratorFiles: developmentCache.decoratorFiles.map((file) => mapToCompiledFile(file, config.sourceDir, outputDir)),
    totalScanned: developmentCache.totalScanned,
    generatedAt: new Date().toISOString(),
    environment: 'production',
  };

  ExpressXScanner.saveCache(productionCache, false, outputDir);
  logger.success(
    `Production cache generated: ${toProjectRelativePath(productionCachePath)} ` +
      `(${productionCache.decoratorFiles.length} file(s) tracked)`,
    'Build',
  );

  if (options.output) {
    logger.info(`Compile TypeScript into the same directory with: tsc --outDir ${outputDir}`, 'Build');
  } else {
    logger.info('Next step: run the TypeScript compiler', 'Build');
  }
  logger.info(
    `Include ${toProjectRelativePath(path.dirname(path.dirname(productionCachePath)))}/ in your deployment`,
    'Build',
  );

  if (verbose) {
    logger.debug(
      `Build summary - source: ${config.sourceDir}, output: ${outputDir}, ` +
        `decorator files: ${productionCache.decoratorFiles.length}`,
      'Build',
    );
  }
}

function mapToCompiledFile(
  file: CachedFileMetadata,
  sourceDirectory: string,
  outputDirectory: string,
): CachedFileMetadata {
  const projectRoot = process.cwd();
  const sourceRoot = path.resolve(projectRoot, sourceDirectory);
  const sourceFile = path.resolve(projectRoot, file.path);
  const relativeSourcePath = path.relative(sourceRoot, sourceFile);

  if (
    relativeSourcePath === '..' ||
    relativeSourcePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeSourcePath)
  ) {
    throw new Error(`Decorator file is outside the configured source directory: "${file.path}"`);
  }

  const compiledPath = path.join(
    path.resolve(projectRoot, outputDirectory),
    replaceTypeScriptExtension(relativeSourcePath),
  );
  return {
    ...file,
    path: toProjectRelativePath(compiledPath),
  };
}

function replaceTypeScriptExtension(filePath: string): string {
  if (filePath.endsWith('.mts')) return `${filePath.slice(0, -4)}.mjs`;
  if (filePath.endsWith('.cts')) return `${filePath.slice(0, -4)}.cjs`;
  if (filePath.endsWith('.tsx')) return `${filePath.slice(0, -4)}.js`;
  if (filePath.endsWith('.ts')) return `${filePath.slice(0, -3)}.js`;
  throw new Error(`Cannot map unsupported TypeScript file to production output: "${filePath}"`);
}

function toProjectRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}
