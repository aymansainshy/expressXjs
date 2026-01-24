
import express, { Express } from 'express';
import { inject, injectable } from 'tsyringe';
import { ExpressXScanner } from '../scanner';



@injectable()
export class Kernel {
  protected app!: Express;
  private initialized = false;

  // constructor(
  //   @inject(ExpressXScanner) protected scanner: ExpressXScanner,
  // ) { }

  public async start(): Promise<Express> {
    if (this.initialized) return this.app;
    const isDevMode = process.env.EXPRESSX_RUNTIME === 'ts';

    // 1. Scan for controllers, configs, etc.
    const env = isDevMode ? 'Development' : 'Production';

    console.log(`\n⚡ ExpressX Framework - ${env} Mode\n`);
    console.log('═'.repeat(60) + '\n');

    // Load cache
    const cache = ExpressXScanner.loadCache(isDevMode);
    if (cache) {
      // SUCCESS: Use cache
      console.log(`✅ Cache loaded successfully`);
      console.log(`   Decorator files: ${cache.decoratorFiles.length}`);
      console.log(`   Generated: ${new Date(cache.generatedAt).toLocaleString()}\n`);

      console.time('📦 Import Time');
      await ExpressXScanner.importFromCache(cache, isDevMode);
      console.timeEnd('📦 Import Time');
    } else {
      // FALLBACK LOGIC
      if (isDevMode) {
        // Development: Allow fallback scan
        console.log('⚠️  Cache not found - performing scan...\n');

        const newCache = await ExpressXScanner.fullScan(true);
        ExpressXScanner.saveCache(newCache, true);

        console.log(`💾 Cache saved for next startup\n`);

        console.time('📦 Import Time');
        await ExpressXScanner.importFromCache(newCache, true);
        console.timeEnd('📦 Import Time');
      } else {
        // Production: STRICT - must have cache
        const config = ExpressXScanner.getConfig();
        throw new Error(
          '❌ PRODUCTION CACHE NOT FOUND!\n\n' +
          'The production cache is required for deployment.\n\n' +
          '═══════════════════════════════════════════════════\n' +
          'SOLUTION:\n' +
          '═══════════════════════════════════════════════════\n\n' +
          '1. Update package.json scripts:\n' +
          '   {\n' +
          '     "scripts": {\n' +
          '       "build": "expressx build && tsc"\n' +
          '     }\n' +
          '   }\n\n' +
          '2. Run build command:\n' +
          '   npm run build\n\n' +
          '3. Verify cache exists:\n' +
          `   ${config.outDir}/.expressx/cache.json\n\n` +
          '4. Deploy entire dist/ folder (including .expressx/)\n\n' +
          '═══════════════════════════════════════════════════\n'
        );
      }
    }
    console.log('═'.repeat(60));
    console.log('✅ Framework initialized successfully\n');

    // 2. validate configurations

    // 3. Create Express App
    const app = express();
    this.app = app;

    this.initialized = true;
    return this.app;
  }
}


