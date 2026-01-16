import { glob } from "glob";
import path from "path";
import { injectable } from "tsyringe";


@injectable()
export class Scanner {
  constructor() { }
  /**
   * Logic to find and import controller files automatically
   */
  public async scanControllers(): Promise<void> {
    const srcPath = path.join(process.cwd(), 'src');
    const pattern = path.join(srcPath, '**/*.{ts,js}').replace(/\\/g, '/');
    const files = await glob(pattern, {
      ignore: ['**/*.d.ts', '**/*.test.ts', '**/node_modules/**']
    });
    for (const file of files) {
      try { await import(path.resolve(file)); } catch (e) { }
    }
  }

}