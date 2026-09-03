import fs from 'fs';
import path from 'path';
import { ExpressXScanner, type ScanConfig } from '@expressxjs/core/scanner';
import {
  ComponentType,
  componentDirectories,
  componentTypes,
  createResourceTemplates,
  createTemplateContext,
  templates,
  typeAliases,
} from '../constant/appComponents';
import { logger } from '../constant/logger';

export interface GenerateOptions {
  dryRun?: boolean;
  force?: boolean;
  path?: string;
}

interface GeneratedFile {
  path: string;
  content: string;
}

export class Generator {
  private readonly sourceDir: string;

  constructor() {
    this.sourceDir = this.getConfig().sourceDir;
  }

  public getConfig(): ScanConfig {
    return ExpressXScanner.getConfig();
  }

  public generate(typeInput: string, name: string, customPath?: string, options: GenerateOptions = {}): void {
    const type = typeAliases[typeInput.toLowerCase()];
    if (!type) {
      throw new Error(`Unknown type: ${typeInput}. Available: ${[...componentTypes, 'resource'].join(', ')}`);
    }

    if (!name.trim()) {
      throw new Error('A component name is required.');
    }

    const targetPath = options.path || customPath;
    const files =
      type === 'resource'
        ? this.createResourceFiles(name, targetPath)
        : [this.createComponentFile(type, name, targetPath)];

    this.writeFiles(type, name, files, options);
  }

  public generateBatch(
    items: Array<{
      type: string;
      name: string;
      path?: string;
    }>,
    options: GenerateOptions = {},
  ): void {
    logger.info(`Generating ${items.length} component(s)...`, 'Generator');
    for (const item of items) {
      this.generate(item.type, item.name, item.path, options);
    }
    logger.success('Batch generation complete', 'Generator');
  }

  private createComponentFile(type: ComponentType, name: string, customPath?: string): GeneratedFile {
    const context = createTemplateContext(type, name);
    const directory = customPath
      ? this.resolveProjectPath(customPath)
      : this.resolveProjectPath(path.join(this.sourceDir, componentDirectories[type]));
    const suffix = type === 'exception' ? 'exception-handler' : type;

    return {
      path: path.join(directory, `${context.fileName}.${suffix}.ts`),
      content: templates[type](context),
    };
  }

  private createResourceFiles(name: string, customPath?: string): GeneratedFile[] {
    const context = createTemplateContext('controller', name);
    const directory = customPath
      ? this.resolveProjectPath(customPath)
      : this.resolveProjectPath(path.join(this.sourceDir, 'modules', context.routeName));

    return Object.entries(createResourceTemplates(name)).map(([fileName, content]) => ({
      path: path.join(directory, fileName),
      content,
    }));
  }

  private resolveProjectPath(targetPath: string): string {
    const root = process.cwd();
    const resolved = path.resolve(root, targetPath);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Generation path must stay inside the project: ${targetPath}`);
    }
    return resolved;
  }

  private writeFiles(
    type: ComponentType | 'resource',
    name: string,
    files: GeneratedFile[],
    options: GenerateOptions,
  ): void {
    const relativeFiles = files.map((file) => path.relative(process.cwd(), file.path));

    if (options.dryRun) {
      logger.info('Dry run - no files will be created', 'Generator');
      for (const [index, file] of files.entries()) {
        logger.info(`Would create: ${relativeFiles[index]}`, 'Generator');
        logger.debug(file.content, 'Generator Preview');
      }
      return;
    }

    const existingFiles = files.filter((file) => fs.existsSync(file.path));
    if (existingFiles.length > 0 && !options.force) {
      const list = existingFiles.map((file) => `  - ${path.relative(process.cwd(), file.path)}`).join('\n');
      throw new Error(`Refusing to overwrite existing files:\n${list}\nUse --force to overwrite them.`);
    }

    for (const file of files) {
      fs.mkdirSync(path.dirname(file.path), {
        recursive: true,
      });
      fs.writeFileSync(file.path, file.content, 'utf-8');
      logger.success(`Created ${path.relative(process.cwd(), file.path)}`, 'Generator');
    }

    logger.success(
      type === 'resource'
        ? `Resource "${name}" generated with controller, service, and DTO`
        : `${type} "${name}" generated`,
      'Generator',
    );
  }
}
