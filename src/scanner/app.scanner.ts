import { glob } from "glob";
import path from "path";
import { injectable } from "tsyringe";


@injectable()
export class Scanner {
  constructor() { }


  private async scanConfigs(configSource?: Map<string, any> | NodeJS.ProcessEnv): Promise<void> {
    // Future implementation for configs
  }

  private async scanGlobalErrorHanler(): Promise<void> {
    // Future implementation for error handlers
  }

  private async scanGlobalInterceptor(): Promise<void> {
    // Future implementation for interceptors
  }

  /**
  * Logic to find and import controller files automatically
  */
  private async scanControllers(): Promise<void> {
    const srcPath = path.join(process.cwd(), 'src');
    const pattern = path.join(srcPath, '**/*.{ts,js}').replace(/\\/g, '/');
    const files = await glob(pattern, {
      ignore: ['**/*.d.ts', '**/*.test.ts', '**/node_modules/**']
    });
    for (const file of files) {
      try { await import(path.resolve(file)); } catch (e) { }
    }
  }


  public async scanAll(configSource?: Map<string, any> | NodeJS.ProcessEnv): Promise<void> {
    await Promise.all([
      this.scanConfigs(configSource),
      this.scanGlobalErrorHanler(),
      this.scanGlobalInterceptor(),
      this.scanControllers()
    ]);
  }
}