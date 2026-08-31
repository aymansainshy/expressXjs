import path from "path";
import fs from 'fs';
import { templates } from "../constant/appComponents";
import { toKebabCase } from "../utils/toKebabCase";
import { toPascalCase } from "../utils/toPascalCase";
import { colors } from "../constant/colors";
import { logger } from "../constant/logger";
import { ScanConfig } from "../constant/scanInerfaces";

export interface GenerateOptions {
  dryRun?: boolean;
  force?: boolean;
  path?: string;
}

// --- Generators ---
export class Generator {
  private sourceDir: string;

  constructor() {
    this.sourceDir = this.getConfig().sourceDir;
  }

  getConfig(): ScanConfig {
    const pkgPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(pkgPath)) {
      const error = new Error('package.json not found in current directory.');
      logger.error(error.message, 'Generator', error);
      throw error;
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    if (!pkg.expressx?.sourceDir) {
      const error = new Error(
        'Missing "expressx.sourceDir" in package.json.\n\n' +
        'Add this configuration:\n' +
        '{\n' +
        '  "expressx": {\n' +
        '    "sourceDir": "src"\n' +
        '  }\n' +
        '}'
      );
      logger.error(error.message, 'Generator', error);
      throw error;
    }

    return {
      sourceDir: pkg.expressx.sourceDir,
      outDir: pkg.expressx.outDir
    };
  }

  generate(type: string, name: string, customPath?: string, options: GenerateOptions = {}): void {
    const className = toPascalCase(name);
    const fileName = toKebabCase(name);

    // Extract options with defaults
    const dryRun = options.dryRun || false;
    const force = options.force || false;
    const targetPath = options.path || customPath;

    if (!templates[type as keyof typeof templates]) {
      const error = new Error(`Unknown type: ${type}. Available: controller, service, middleware, interceptor, application`);
      logger.error(error.message, 'Generator', error);
      throw error;
    }

    logger.debug(`Generating ${type} "${className}" from template`, 'Generator');

    const content = templates[type as keyof typeof templates](className);

    // Determine file path
    let filePath: string;
    if (targetPath) {
      filePath = path.join(process.cwd(), targetPath, `${fileName}.${type}.ts`);
    } else {
      filePath = path.join(process.cwd(), this.sourceDir, `${fileName}.${type}.ts`);
    }

    const relativePath = path.relative(process.cwd(), filePath);

    // Dry run mode - just show what would happen
    if (dryRun) {
      console.log(colors.cyan('\n🔍 Dry Run Mode - No files will be created\n'));
      console.log(colors.gray('─'.repeat(60)));
      console.log(colors.bold('Would create:'));
      console.log(`  Type: ${colors.cyan(type)}`);
      console.log(`  Name: ${colors.cyan(className)}`);
      console.log(`  File: ${colors.cyan(relativePath)}`);
      console.log(colors.gray('─'.repeat(60)));
      console.log(colors.bold('\nFile preview:\n'));
      console.log(colors.gray(content));
      console.log(colors.gray('─'.repeat(60)));
      console.log(colors.yellow('\n💡 Run without --dry-run to create the file\n'));
      return;
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      logger.debug(`Creating directory: ${path.relative(process.cwd(), dir)}`, 'Generator');
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check if file exists
    if (fs.existsSync(filePath)) {
      if (!force) {
        logger.warn(`File already exists: ${relativePath} - use --force to overwrite`, 'Generator');
        return;
      } else {
        logger.warn(`Overwriting existing file: ${relativePath}`, 'Generator');
      }
    }

    // Write file
    fs.writeFileSync(filePath, content);

    // Success message
    logger.success(`Created ${type}: ${relativePath}`, 'Generator');
  }

  /**
   * Generate multiple files at once
   */
  generateBatch(items: Array<{ type: string; name: string; path?: string }>, options: GenerateOptions = {}): void {
    logger.info(`Generating ${items.length} file(s)...`, 'Generator');

    for (const item of items) {
      this.generate(item.type, item.name, item.path, options);
    }

    logger.success('Batch generation complete', 'Generator');
  }
}