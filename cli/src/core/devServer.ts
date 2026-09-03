import path from 'path';
import fs, { existsSync } from 'fs';
import chokidar, { FSWatcher } from 'chokidar';
import { spawn, ChildProcess } from 'child_process';
import { shouldIgnoreWatchPath } from '../constant/ignoreFiles';
import { CachedFileMetadata, FileCache } from '../constant/scanInerfaces';
import { ExpressXScanner } from '@expressxjs/core/scanner';
import { frameworkLogo } from '../constant/appStarter';
import { logger } from '../constant/logger';

export interface DevServerOptions {
  nodeFlags?: string[];
  appFlags?: string[];
}

export class DevServer {
  private child: ChildProcess | null = null;
  private watcher: FSWatcher | null = null;
  private cacheWatcher: FSWatcher | null = null;
  private isRestarting = false;
  private cache: FileCache | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;
  private entry: string;
  private options: DevServerOptions;

  constructor(entry: string, options: DevServerOptions = {}) {
    this.entry = entry;
    this.options = {
      nodeFlags: options.nodeFlags || [],
      appFlags: options.appFlags || [],
    };
  }

  async start(): Promise<void> {
    logger.info(frameworkLogo, 'DevServer');

    // Display enabled flags
    if (this.options.nodeFlags && this.options.nodeFlags.length > 0) {
      logger.info(`Node.js flags: ${this.options.nodeFlags.join(' ')}`, 'DevServer');
    }

    if (this.options.appFlags && this.options.appFlags.length > 0) {
      logger.info(`Application flags: ${this.options.appFlags.join(' ')}`, 'DevServer');
    }

    await this.initializeCache();
    this.watchCacheDirectory();
    this.startApp();
    this.setupWatcher();
    this.setupGracefulShutdown();
  }

  /**
   * Load or create cache
   */
  private async initializeCache(): Promise<void> {
    this.cache = ExpressXScanner.loadCache(true);

    if (this.cache) {
      //  Validate cache entries - remove files that don't exist
      // PHASE 1: Validate existing cached files (fast)
      const { validFiles, updatedCount, removedCount } = await this.validateCachedFiles();

      // Report changes
      const totalChanges = updatedCount + removedCount;

      if (totalChanges > 0) {
        this.cache.decoratorFiles = validFiles;
        this.cache.generatedAt = new Date().toISOString();
        ExpressXScanner.saveCache(this.cache, true);

        logger.info(
          `Cache updated - ${updatedCount} file(s) refreshed, ${removedCount} file(s) removed`,
          '.expressx/cache.json',
        );
      } else {
        logger.info('.expressx.cache is up-to-date! No changes detected.', '.expressx/cache.json');
      }

      const cacheAge = Date.now() - new Date(this.cache.generatedAt).getTime();
      const ageMinutes = Math.round(cacheAge / 60000);

      logger.info(
        `Total decorator files: ${this.cache.decoratorFiles.length},  Last updated: ${ageMinutes} minute(s) ago`,
        '.expressx/cache.json',
      );
    } else {
      logger.info('No cache found, creating new cache...', '.expressx/cache.json');

      this.cache = {
        version: '1.0.0',
        decoratorFiles: [],
        totalScanned: 0,
        generatedAt: new Date().toISOString(),
        environment: 'development',
      };
    }
  }

  /**
   * PHASE 1: Validate existing cache entries using metadata
   * Returns: { validFiles, updatedCount, removedCount }
   */
  private async validateCachedFiles(): Promise<{
    validFiles: CachedFileMetadata[];
    updatedCount: number;
    removedCount: number;
  }> {
    const validFiles: CachedFileMetadata[] = [];
    let updatedCount = 0;
    let removedCount = 0;

    for (const cachedFile of this.cache!.decoratorFiles) {
      const absolutePath = path.join(process.cwd(), cachedFile.path);

      try {
        const stats = fs.statSync(absolutePath);

        // FAST PATH: Metadata matches - no need to read file
        if (stats.mtimeMs === cachedFile.mtime && stats.size === cachedFile.size) {
          validFiles.push(cachedFile);
          continue;
        }

        // SLOW PATH: Metadata changed - re-check content
        if (this.checkForDecorators(absolutePath)) {
          validFiles.push({
            path: cachedFile.path,
            mtime: stats.mtimeMs,
            size: stats.size,
          });
          updatedCount++;
        } else {
          // File changed and no longer has decorators
          removedCount++;
        }
      } catch {
        // File deleted
        removedCount++;
      }
    }

    return {
      validFiles,
      updatedCount,
      removedCount,
    };
  }

  /**
   * Watch cache directory persistently
   */
  private watchCacheDirectory(): void {
    const config = ExpressXScanner.getConfig();
    const cachePath = path.join(process.cwd(), config.sourceDir, '.expressx', 'cache.json');

    this.cacheWatcher = chokidar.watch(cachePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    this.cacheWatcher.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Cache watcher error: ${message}`, '.expressx/cache.json');
    });

    logger.debug(`Watching cache file: ${cachePath}`, '.expressx/cache.json');

    // Cache deleted
    this.cacheWatcher.on('unlink', () => {
      logger.warn('Cache deleted - resetting to an empty cache', '.expressx/cache.json');
      if (this.cache) {
        this.cache.decoratorFiles = [];
        this.cache.totalScanned = 0;
        this.cache.generatedAt = new Date().toISOString();
      }
    });

    // Cache added/recreated
    this.cacheWatcher.on('add', () => {
      logger.debug('Cache created by the framework - reloading...', '.expressx/cache.json');
      setTimeout(() => {
        this.cache = ExpressXScanner.loadCache(true);
        if (this.cache) {
          logger.debug(`Reloaded ${this.cache.decoratorFiles.length} decorator file(s)`, '.expressx/cache.json');
        }
      }, 100);
    });

    // Cache changed
    this.cacheWatcher.on('change', () => {
      const updatedCache = ExpressXScanner.loadCache(true);
      if (updatedCache) {
        this.cache = updatedCache;
        logger.debug(
          `Cache reloaded - ${updatedCache.decoratorFiles.length} decorator file(s)`,
          '.expressx/cache.json',
        );
      }
    });
  }

  private startApp(): void {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }

    // Inside your CLI command handler
    if (!this.runDoctor(this.entry)) {
      logger.error('Environment checks failed - please fix the issues above', 'Doctor');
      process.exit(1);
    }

    process.env.EXPRESSX_RUNTIME = 'ts';
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';

    logger.info(`Starting application, Entry file: ${this.entry}`, 'Startup');

    // Build complete command array
    // Format: node [nodeFlags] [entry] [appFlags]
    const nodeArgs = [
      ...(this.options.nodeFlags || []), // Custom Node.js flags (--inspect, etc.)
      '--require',
      '@expressxjs/core/runtime', // Required runtime
      '--enable-source-maps', // Source maps
      this.entry, // Entry file
      ...(this.options.appFlags || []), // Application flags (--port, etc.)
    ];

    if (this.options.nodeFlags && this.options.nodeFlags.length > 0) {
      logger.debug(`Node flags: ${this.options.nodeFlags.join(' ')}`, 'Startup');
    }
    if (this.options.appFlags && this.options.appFlags.length > 0) {
      logger.debug(`App flags: ${this.options.appFlags.join(' ')}`, 'Startup');
    }

    this.child = spawn('node', nodeArgs, {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd(),
    });

    this.child.on('exit', (code, signal) => {
      // Clear the child reference when process exits
      const wasRestarting = this.isRestarting;
      this.child = null; // Clear reference

      if (signal === 'SIGTERM' || wasRestarting) {
        return;
      }

      if (code !== 0) {
        logger.error(`Application process exited with code ${code}`, 'DevServer');
        logger.warn('Waiting for file changes to restart...', 'DevServer');
      }
    });

    this.child.on('error', (err) => {
      logger.error(`Failed to start the application process: ${err.message}`, 'DevServer', err);
      this.child = null; // Clear reference on spawn error
    });
  }

  private runDoctor(entry: string): boolean {
    logger.info('ExpressXjs Doctor: Checking your environment...', 'Doctor');

    const checks = [
      {
        name: 'Entry File',
        passed: existsSync(path.resolve(process.cwd(), entry)),
        error: `Could not find entry file at ${entry}`,
      },
      // {
      //   name: 'Reflect Polyfill',
      //   passed: !!require.resolve('reflect-metadata'),
      //   error: 'reflect-metadata is missing from the dependency tree.',
      // },
      {
        name: 'Runtime Entry',
        passed: !!require.resolve('@expressxjs/core/runtime'),
        error: '@expressxjs/core/runtime is not reachable.',
      },
    ];

    let allPassed = true;

    checks.forEach((check) => {
      if (check.passed) {
        logger.info(`${check.name}`, 'Doctor');
      } else {
        logger.error(`${check.name}: ${check.error}`, 'Doctor');
        allPassed = false;
      }
    });

    return allPassed;
  }

  private setupWatcher(): void {
    const config = ExpressXScanner.getConfig();
    const watchDirectory = config.sourceDir;

    logger.info(`Start watching TypeScript files in: ${watchDirectory}`, 'Watcher');

    this.watcher = chokidar.watch(watchDirectory, {
      ignored: shouldIgnoreWatchPath,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', (filepath) => this.handleFileChange(filepath, 'changed'));
    this.watcher.on('add', (filepath) => this.handleFileChange(filepath, 'added'));
    this.watcher.on('unlink', (filepath) => this.handleFileChange(filepath, 'deleted'));
    this.watcher.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`File watcher error: ${message}`, 'Watcher');
    });
  }

  /**
   * Handle file changes
   */
  private handleFileChange(filepath: string, action: string): void {
    if (!this.cache) return;

    const relativePath = path.relative(process.cwd(), filepath).replace(/\\/g, '/');
    const absolutePath = path.resolve(filepath);

    logger.info(`File ${action}: ${relativePath}`, 'Watcher');

    let cacheUpdated = false;

    if (action === 'deleted') {
      const index = this.cache.decoratorFiles.findIndex((f) => f.path === relativePath);
      if (index !== -1) {
        this.cache.decoratorFiles.splice(index, 1);
        logger.debug(`Removed "${relativePath}" from the cache`, '.expressx/cache.json');
        cacheUpdated = true;
      }
    } else {
      const hasDecorators = this.checkForDecorators(absolutePath);
      const cachedFile = this.cache.decoratorFiles.find((f) => f.path === relativePath);

      if (hasDecorators) {
        const stats = fs.statSync(absolutePath);
        const newData: CachedFileMetadata = {
          path: relativePath,
          mtime: stats.mtimeMs,
          size: stats.size,
        };

        if (!cachedFile) {
          this.cache.decoratorFiles.push(newData);
          logger.debug(`Added "${relativePath}" to the cache (decorator detected)`, '.expressx/cache.json');
          cacheUpdated = true;
        } else if (cachedFile.mtime !== stats.mtimeMs) {
          Object.assign(cachedFile, newData);
          logger.debug(`Updated cache metadata for "${relativePath}"`, '.expressx/cache.json');
          cacheUpdated = true;
        }
      } else if (cachedFile) {
        this.cache.decoratorFiles = this.cache.decoratorFiles.filter((f) => f.path !== relativePath);
        logger.warn(`Removed "${relativePath}" from the cache - no decorators left`, '.expressx/cache.json');
        cacheUpdated = true;
      }
    }

    // Save cache if updated
    if (cacheUpdated) {
      this.cache.generatedAt = new Date().toISOString();
      ExpressXScanner.saveCache(this.cache, true);
      logger.success(`Cache saved - ${this.cache.decoratorFiles.length} decorator file(s)`, '.expressx/cache.json');
    } else {
      logger.debug(
        `No cache update needed (${this.cache.decoratorFiles.length} decorator file(s))`,
        '.expressx/cache.json',
      );
    }

    this.scheduleRestart();
  }

  /**
   * Check if file contains decorators - FIXED VERSION
   */
  private checkForDecorators(filepath: string): boolean {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');

      // Fast-Path 2: Symbol check (instant)
      if (!content.includes('@')) return false;

      // Fast-Path 3: Decorator name substring (fast)
      const decorators = ExpressXScanner['DECORATORS'] as string[];

      return decorators.some((decorator) => {
        // Quick substring check before regex
        if (!content.includes(decorator)) return false;

        const decoratorName = decorator.replace('@', '');
        const pattern = new RegExp(`@${decoratorName}(\\s*\\(|\\s|$)`, 'm');
        return pattern.test(content);
      });
    } catch {
      return false;
    }
  }

  private scheduleRestart(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    this.restartTimeout = setTimeout(() => {
      this.restart();
    }, 300);
  }

  private restart(): void {
    if (this.isRestarting) return;

    this.isRestarting = true;
    logger.info('Restarting application...', 'DevServer');

    if (this.child && !this.child.killed) {
      // Process is still alive - kill it gracefully
      this.child.once('exit', () => {
        this.isRestarting = false;
        this.startApp();
      });
      this.child.kill('SIGTERM');
    } else {
      // Process already dead or doesn't exist - start immediately
      this.isRestarting = false;
      this.startApp();
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.warn(`Received ${signal} - shutting down gracefully...`, 'DevServer');

      if (this.watcher) {
        this.watcher.close();
        logger.debug('File watcher closed', 'Watcher');
      }

      if (this.cacheWatcher) {
        this.cacheWatcher.close();
        logger.debug('Cache watcher closed', 'Watcher');
      }

      if (this.child) {
        this.child.kill('SIGTERM');
        setTimeout(() => {
          if (this.child && !this.child.killed) {
            logger.warn('Application did not exit in time - sending SIGKILL', 'DevServer');
            this.child.kill('SIGKILL');
          }
          process.exit(0);
        }, 2000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}
