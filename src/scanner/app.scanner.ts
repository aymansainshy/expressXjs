import { inject, injectable } from 'tsyringe';
import { glob } from 'glob';
import path from 'path';
import { pathToFileURL } from 'url';
import { ExpressXLogger } from '../logger/logger';

@injectable()
export class Scanner {
  constructor(
    @inject(ExpressXLogger) private logger: ExpressXLogger,
  ) { }


  public async scanProject(): Promise<void> {
    // We only look inside /src
    const rootDir = path.join(process.cwd(), 'src');

    /**
     * The Pattern Breakdown:
     * *application* - Any file with "application" anywhere in the name
     * *controller* - Any file with "controller" anywhere in the name
     * *interceptor* - Any file with "interceptor" anywhere in the name
     * *middleware* - Any file with "middleware" anywhere in the name
     * .ts              - Must be a TypeScript file
     */
    const pattern = '**/+(*application*|*controller*|*interceptor*|*middleware*).{ts,js,mjs,cjs}';

    console.time('🚀 Discovery Time');

    const files = await glob(pattern, {
      cwd: rootDir,
      absolute: true
    });

    // Use Promise.all to import files in parallel
    await Promise.all(
      files.map(async (file) => {
        try {
          // pathToFileURL is vital for Windows support
          this.logger.info(`🔍 Importing .... : ${file}`);
          await import(pathToFileURL(file).href);
        } catch (err) {
          console.error(`❌ Failed to import ${file}:`, err);
        }
      })
    );

    console.timeEnd('🚀 Discovery Time');
  }
}