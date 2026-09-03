import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'glob';
import ts from 'typescript';
import { logger } from '../logger/logger';

export interface ScanConfig {
  sourceDir: string;
  outDir: string;
}

export interface CachedFileMetadata {
  path: string;
  mtime: number;
  size: number;
  hash?: string;
}

export interface FileCache {
  version: string;
  decoratorFiles: CachedFileMetadata[];
  totalScanned: number;
  generatedAt: string;
  environment: 'development' | 'production';
}

export const EXPRESSX_CACHE_VERSION = '1.0.0';
export const EXPRESSX_DECORATORS = [
  'UseGlobalInterceptor',
  'UseGlobalExceptionHandler',
  'Application',
  'Controller',
] as const;

interface DecoratorImports {
  identifiers: Set<string>;
  namespaces: Set<string>;
}

const decoratorNames = new Set<string>(EXPRESSX_DECORATORS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isExpressXModule(moduleName: string): boolean {
  return moduleName === '@expressxjs/core' || moduleName.startsWith('@expressxjs/core/');
}

function getRequiredModule(expression: ts.Expression | undefined): string | null {
  if (
    !expression ||
    !ts.isCallExpression(expression) ||
    !ts.isIdentifier(expression.expression) ||
    expression.expression.text !== 'require' ||
    expression.arguments.length !== 1
  ) {
    return null;
  }

  const [moduleName] = expression.arguments;
  return ts.isStringLiteral(moduleName) ? moduleName.text : null;
}

function collectDecoratorImports(sourceFile: ts.SourceFile): DecoratorImports {
  const imports: DecoratorImports = {
    identifiers: new Set<string>(),
    namespaces: new Set<string>(),
  };

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      if (!isExpressXModule(statement.moduleSpecifier.text)) continue;

      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        imports.namespaces.add(bindings.name.text);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          if (decoratorNames.has(importedName)) {
            imports.identifiers.add(element.name.text);
          }
        }
      }
      continue;
    }

    if (
      ts.isImportEqualsDeclaration(statement) &&
      ts.isExternalModuleReference(statement.moduleReference) &&
      ts.isStringLiteral(statement.moduleReference.expression) &&
      isExpressXModule(statement.moduleReference.expression.text)
    ) {
      imports.namespaces.add(statement.name.text);
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;

    for (const declaration of statement.declarationList.declarations) {
      const moduleName = getRequiredModule(declaration.initializer);
      if (!moduleName || !isExpressXModule(moduleName)) continue;

      if (ts.isIdentifier(declaration.name)) {
        imports.namespaces.add(declaration.name.text);
        continue;
      }

      if (ts.isObjectBindingPattern(declaration.name)) {
        for (const element of declaration.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const importedName = element.propertyName?.getText(sourceFile) ?? element.name.text;
          if (decoratorNames.has(importedName)) {
            imports.identifiers.add(element.name.text);
          }
        }
      }
    }
  }

  return imports;
}

function unwrapCallee(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isPartiallyEmittedExpression(current)
  ) {
    current = current.expression;
  }

  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.CommaToken) {
    return unwrapCallee(current.right);
  }

  return current;
}

function isDecoratorCall(expression: ts.Expression, imports: DecoratorImports, allowCanonicalName: boolean): boolean {
  const callee = unwrapCallee(ts.isCallExpression(expression) ? expression.expression : expression);

  if (ts.isIdentifier(callee)) {
    return imports.identifiers.has(callee.text) || (allowCanonicalName && decoratorNames.has(callee.text));
  }

  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return imports.namespaces.has(callee.expression.text) && decoratorNames.has(callee.name.text);
  }

  if (
    ts.isElementAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    imports.namespaces.has(callee.expression.text) &&
    callee.argumentExpression &&
    ts.isStringLiteral(callee.argumentExpression)
  ) {
    return decoratorNames.has(callee.argumentExpression.text);
  }

  return false;
}

export class ExpressXScanner {
  private static isTypeScriptRuntime(): boolean {
    const runtime = process.env.EXPRESSX_RUNTIME?.trim().toLowerCase();
    const isDevelopment = process.env.NODE_ENV?.trim().toLowerCase() === 'development';

    if (runtime && runtime !== 'ts' && runtime !== 'js') {
      throw new Error('EXPRESSX_RUNTIME must be either "ts" or "js" when it is defined.');
    }

    return runtime === 'ts' || isDevelopment;
  }

  static getConfig(): ScanConfig {
    const pkgPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(pkgPath)) {
      throw new Error(
        `ExpressX scanner could not find package.json in "${process.cwd()}". ` +
          'Run the application from the project root.',
      );
    }

    let pkg: Record<string, any>;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, any>;
    } catch (error) {
      throw new Error(`ExpressX scanner could not parse "${pkgPath}": ${(error as Error).message}`);
    }

    if (typeof pkg.expressx?.sourceDir !== 'string' || !pkg.expressx.sourceDir.trim()) {
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

    if (pkg.expressx.outDir !== undefined && typeof pkg.expressx.outDir !== 'string') {
      throw new Error('ExpressX scanner expected "expressx.outDir" in package.json to be a string.');
    }

    return {
      sourceDir: pkg.expressx.sourceDir,
      outDir: pkg.expressx.outDir || 'dist',
    };
  }

  static getCachePath(isDevMode: boolean, directoryOverride?: string): string {
    const config = this.getConfig();
    const directory = directoryOverride ?? (isDevMode ? config.sourceDir : config.outDir);
    const resolvedDirectory = this.resolveProjectPath(directory, 'cache directory');
    return path.join(resolvedDirectory, '.expressx', 'cache.json');
  }

  static loadCache(isDevMode: boolean, directoryOverride?: string): FileCache | null {
    const cachePath = this.getCachePath(isDevMode, directoryOverride);

    if (!fs.existsSync(cachePath)) return null;

    try {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as unknown;
      const validationError = this.getCacheValidationError(cache, isDevMode);
      if (validationError) {
        logger.warn(`Ignoring invalid cache at "${cachePath}": ${validationError}`, '.expressx/cache.json');
        return null;
      }
      return cache as FileCache;
    } catch (error) {
      logger.warn(`Failed to read cache at "${cachePath}": ${(error as Error).message}`, '.expressx/cache.json');
      return null;
    }
  }

  static saveCache(cache: FileCache, isDevMode: boolean, directoryOverride?: string): void {
    const validationError = this.getCacheValidationError(cache, isDevMode);
    if (validationError) {
      throw new Error(`ExpressX refused to write an invalid cache: ${validationError}`);
    }

    const cachePath = this.getCachePath(isDevMode, directoryOverride);
    const cacheDir = path.dirname(cachePath);
    const temporaryPath = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;

    fs.mkdirSync(cacheDir, {
      recursive: true,
    });

    try {
      fs.writeFileSync(temporaryPath, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8');
      fs.renameSync(temporaryPath, cachePath);
    } catch (error) {
      fs.rmSync(temporaryPath, {
        force: true,
      });
      throw error;
    }
  }

  static fileContainsDecorators(filePath: string, isTypeScript: boolean): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!EXPRESSX_DECORATORS.some((decorator) => content.includes(decorator))) return false;

      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        false,
        this.getScriptKind(filePath, isTypeScript),
      );
      const imports = collectDecoratorImports(sourceFile);
      let found = false;

      const visit = (node: ts.Node): void => {
        if (found) return;

        if (isTypeScript && ts.isDecorator(node) && isDecoratorCall(node.expression, imports, true)) {
          found = true;
          return;
        }

        if (!isTypeScript && ts.isCallExpression(node) && isDecoratorCall(node, imports, false)) {
          found = true;
          return;
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      return found;
    } catch {
      return false;
    }
  }

  static async fullScan(isDevMode: boolean): Promise<FileCache> {
    const startTime = Date.now();
    const config = this.getConfig();
    const configuredDirectory = isDevMode ? config.sourceDir : config.outDir;
    const rootDir = this.resolveProjectPath(configuredDirectory, isDevMode ? 'source directory' : 'build directory');
    const pattern = isDevMode ? '**/*.{ts,tsx,mts,cts}' : '**/*.{js,jsx,mjs,cjs}';

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

    logger.info(`Scanning directory: ${rootDir}`, 'Scanning');

    const allFiles = await glob(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/*.spec.*',
        '**/*.test.*',
        '**/*.d.ts',
        '**/*.d.mts',
        '**/*.d.cts',
        '**/dist/**',
        '**/build/**',
        '**/.expressx/**',
        '**/.git/**',
      ],
    });

    logger.info(`Found ${allFiles.length.toLocaleString()} candidate file(s)`, 'Scanning');

    const decoratorFiles: CachedFileMetadata[] = [];
    const chunkSize = 1000;

    for (let index = 0; index < allFiles.length; index += chunkSize) {
      const chunk = allFiles.slice(index, index + chunkSize);

      for (const file of chunk) {
        if (!this.fileContainsDecorators(file, isDevMode)) continue;

        try {
          const stats = fs.statSync(file);
          decoratorFiles.push({
            path: this.toProjectRelativePath(file),
            mtime: stats.mtimeMs,
            size: stats.size,
          });
        } catch {
          // The file was removed between scanning and reading its metadata.
        }
      }

      if (allFiles.length > 0) {
        const progress = Math.min(((index + chunkSize) / allFiles.length) * 100, 100);
        logger.debug(
          `Scan progress: ${progress.toFixed(1)}%; ${decoratorFiles.length} decorator file(s) found`,
          'Scanning',
        );
      }
    }

    const scanTime = Date.now() - startTime;
    const scanEfficiency = allFiles.length === 0 ? 0 : (decoratorFiles.length / allFiles.length) * 100;
    logger.success(
      `Scan completed in ${scanTime}ms; found ${decoratorFiles.length} decorator file(s) ` +
        `across ${allFiles.length} candidate file(s) (${scanEfficiency.toFixed(2)}%)`,
      'Scanning',
    );

    return {
      version: EXPRESSX_CACHE_VERSION,
      decoratorFiles,
      totalScanned: allFiles.length,
      generatedAt: new Date().toISOString(),
      environment: isDevMode ? 'development' : 'production',
    };
  }

  static async importFromCache(cache: FileCache, isDevMode: boolean): Promise<void> {
    const startTime = Date.now();
    const importedPaths = new Set<string>();

    for (const cachedFile of cache.decoratorFiles) {
      const absolutePath = this.resolveProjectPath(cachedFile.path, 'cached decorator file');

      if (importedPaths.has(absolutePath)) {
        logger.warn(`Skipping duplicate import: ${absolutePath}`, 'Importing file');
        continue;
      }

      try {
        logger.debug(`Importing ${absolutePath}`, 'Importing file');

        if (isDevMode) {
          require(absolutePath);
        } else {
          await import(pathToFileURL(absolutePath).href);
        }

        importedPaths.add(absolutePath);
      } catch (error) {
        logger.error(`Failed to import ${cachedFile.path}: ${(error as Error).message}`, 'Importing file');

        if (error instanceof RangeError && error.message.includes('stack')) {
          throw new Error(
            `Circular dependency detected in "${absolutePath}". ` +
              'Check imports between controllers, services, and pipeline components.',
          );
        }

        throw error;
      }
    }

    logger.info(`Imported ${importedPaths.size} decorator file(s) in ${Date.now() - startTime}ms`, 'Importing file');
  }

  static async performScanning(): Promise<void> {
    const isDevMode = this.isTypeScriptRuntime();
    const environment = isDevMode ? 'development' : 'production';

    logger.info(`Running scanner in ${environment} mode`, 'Scanning');

    const cache = this.loadCache(isDevMode);
    if (cache) {
      logger.success(`Loaded ${cache.decoratorFiles.length} decorator file(s) from cache`, '.expressx/cache.json');
      await this.importFromCache(cache, isDevMode);
      return;
    }

    if (isDevMode) {
      logger.warn('Development cache is unavailable; performing a full source scan', 'Scanning');
      const newCache = await this.fullScan(true);
      this.saveCache(newCache, true);
      await this.importFromCache(newCache, true);
      return;
    }

    const cachePath = this.getCachePath(false);
    throw new Error(
      `ExpressX production startup requires a valid cache at "${cachePath}". ` +
        'Run "expressx build" before TypeScript compilation and deploy the complete output directory, including .expressx/cache.json., or if you are running in development mode, set or NODE_ENV=development.',
    );
  }

  /** @deprecated Use performScanning() instead. */
  static async prefurmScanning(): Promise<void> {
    return this.performScanning();
  }

  private static getCacheValidationError(cache: unknown, isDevMode: boolean): string | null {
    if (!isRecord(cache)) return 'the root value must be an object';
    if (cache.version !== EXPRESSX_CACHE_VERSION) {
      return `version ${String(cache.version)} is incompatible with ${EXPRESSX_CACHE_VERSION}`;
    }

    const expectedEnvironment = isDevMode ? 'development' : 'production';
    if (cache.environment !== expectedEnvironment) {
      return `environment must be "${expectedEnvironment}"`;
    }
    if (!Number.isInteger(cache.totalScanned) || (cache.totalScanned as number) < 0) {
      return 'totalScanned must be a non-negative integer';
    }
    if (typeof cache.generatedAt !== 'string' || !Number.isFinite(Date.parse(cache.generatedAt))) {
      return 'generatedAt must be a valid ISO date string';
    }
    if (!Array.isArray(cache.decoratorFiles)) return 'decoratorFiles must be an array';

    for (const [index, file] of cache.decoratorFiles.entries()) {
      if (!isRecord(file)) return `decoratorFiles[${index}] must be an object`;
      if (typeof file.path !== 'string' || !file.path) return `decoratorFiles[${index}].path must be a string`;
      if (path.isAbsolute(file.path)) return `decoratorFiles[${index}].path must be project-relative`;
      if (!Number.isFinite(file.mtime) || (file.mtime as number) < 0) {
        return `decoratorFiles[${index}].mtime must be a non-negative number`;
      }
      if (!Number.isFinite(file.size) || (file.size as number) < 0) {
        return `decoratorFiles[${index}].size must be a non-negative number`;
      }
      if (file.hash !== undefined && typeof file.hash !== 'string') {
        return `decoratorFiles[${index}].hash must be a string when provided`;
      }

      try {
        this.resolveProjectPath(file.path, `decoratorFiles[${index}].path`);
      } catch (error) {
        return (error as Error).message;
      }
    }

    return null;
  }

  private static resolveProjectPath(projectPath: string, label: string): string {
    if (typeof projectPath !== 'string' || !projectPath.trim()) {
      throw new Error(`${label} must be a non-empty path`);
    }

    const projectRoot = path.resolve(process.cwd());
    const resolvedPath = path.resolve(projectRoot, projectPath);
    const relativePath = path.relative(projectRoot, resolvedPath);

    if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      throw new Error(`${label} must remain inside the project directory: "${projectPath}"`);
    }

    return resolvedPath;
  }

  private static toProjectRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/');
  }

  private static getScriptKind(filePath: string, isTypeScript: boolean): ts.ScriptKind {
    if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
    return isTypeScript ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  }
}
