import { glob } from "glob";
import path from "path";
import { injectable } from "tsyringe";
import fs from 'fs/promises';

@injectable()
export class Scanner {
  // Define the "triggers" that make a file worth importing
  private readonly frameworkDecorators = [
    '@Application',
    '@Controller',
    '@GlobalErrorHandler',
  ];

  public async scanProject(): Promise<void> {
    const rootDir = path.join(process.cwd(), 'src');

    // 1. Get all potential files
    const files = await glob('**/*.ts', {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/*.d.ts', '**/*.spec.ts', '**/*.test.ts']
    });

    const importPromises = files.map(async (file) => {
      try {
        // 2. Fast-read the file as text
        const content = await fs.readFile(file, 'utf8');

        // 3. Only import if it contains one of our decorators
        const shouldImport = this.frameworkDecorators.some(decorator =>
          content.includes(decorator)
        );

        if (shouldImport) {
          return await import(file);
        }
      } catch (error) {
        // Silently skip files that aren't readable or fail text-check
      }
    });

    await Promise.all(importPromises);
  }
}