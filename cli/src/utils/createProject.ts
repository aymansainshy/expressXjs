import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createResourceTemplates } from '../constant/appComponents';
import { logger } from '../constant/logger';
import { toKebabCase } from './toKebabCase';

export type ProjectTemplate = 'default' | 'api' | 'full';

export interface CreateProjectOptions {
  template?: ProjectTemplate;
  skipInstall?: boolean;
  skipGit?: boolean;
}

interface ProjectFileMap {
  [relativePath: string]: string;
}

const cliPackage = require('../../package.json') as {
  version: string;
  dependencies: Record<string, string>;
};

const supportedTemplates: ProjectTemplate[] = ['default', 'api', 'full'];

export function createProject(projectName: string, options: CreateProjectOptions = {}): void {
  const template = options.template || 'full';
  if (!supportedTemplates.includes(template)) {
    throw new Error(`Unknown template "${template}". Choose one of: ${supportedTemplates.join(', ')}.`);
  }

  const projectPath = resolveProjectPath(projectName);
  if (fs.existsSync(projectPath)) {
    throw new Error(`Directory already exists: ${projectName}`);
  }

  const directoryName = path.basename(projectPath);
  const packageName = toKebabCase(directoryName).toLowerCase();
  const files = createProjectFiles(packageName, template);

  logger.info(`Creating ExpressX project "${packageName}" with the ${template} template`, 'Project');

  fs.mkdirSync(projectPath, {
    recursive: true,
  });
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(projectPath, relativePath);
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.debug(`Created ${relativePath}`, 'Project');
  }

  if (!options.skipGit) {
    runSetupCommand('git', ['init'], projectPath, 'Git repository');
  }

  if (!options.skipInstall) {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    runSetupCommand(npmCommand, ['install'], projectPath, 'Dependencies');
  }

  logger.success(`Project "${packageName}" created successfully`, 'Project');
  printNextSteps(projectName, options);
}

function resolveProjectPath(projectName: string): string {
  const trimmedName = projectName.trim();
  if (!trimmedName || path.isAbsolute(trimmedName)) {
    throw new Error('Project name must be a non-empty relative path.');
  }

  const root = process.cwd();
  const resolved = path.resolve(root, trimmedName);
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Project directory must be created inside the current directory.');
  }
  return resolved;
}

function createProjectFiles(projectName: string, template: ProjectTemplate): ProjectFileMap {
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    description: `ExpressX application generated with the ${template} template`,
    type: 'commonjs',
    main: 'dist/index.js',
    scripts: {
      dev: 'expressx dev',
      build: 'expressx build && tsc',
      start: 'node dist/index.js',
      typecheck: 'tsc --noEmit',
      'generate:resource': 'expressx generate resource',
    },
    expressx: {
      sourceDir: 'src',
      outDir: 'dist',
      main: 'src/index.ts',
    },
    dependencies: {
      '@expressxjs/core': cliPackage.dependencies['@expressxjs/core'],
      express: '^5.2.1',
    },
    devDependencies: {
      '@expressxjs/cli': cliPackage.version,
      '@types/node': '^24.0.0',
      typescript: '^5.5.2',
    },
  };

  const tsConfig = {
    compilerOptions: {
      target: 'ES2021',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      rootDir: './src',
      outDir: './dist',
      strict: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      sourceMap: true,
      declaration: true,
      declarationMap: true,
    },
    include: ['src/**/*.ts'],
    exclude: ['node_modules', 'dist'],
  };

  const files: ProjectFileMap = {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'tsconfig.json': `${JSON.stringify(tsConfig, null, 2)}\n`,
    '.gitignore': `node_modules/
dist/
src/.expressx/
*.log
.env
.DS_Store
`,
    '.env.example': `PORT=3000
`,
    'src/application.ts': createApplicationTemplate(),
    'src/index.ts': createBootstrapTemplate(projectName, 'MyApplication'),
  };

  addResource(files, 'User', template === 'full');

  if (template === 'api' || template === 'full') {
    files['src/common/exceptions/app.exception-handler.ts'] = createExceptionHandlerTemplate();
  }

  if (template === 'full') {
    files['src/common/middlewares/request-logger.middleware.ts'] = createMiddlewareTemplate();
    files['src/common/interceptors/timing.interceptor.ts'] = createInterceptorTemplate();
    files['src/common/interceptors/response-envelope.interceptor.ts'] = createGlobalInterceptorTemplate();
  }

  files['README.md'] = createReadme(projectName, template, Object.keys(files));
  return files;
}

function addResource(files: ProjectFileMap, name: string, withPipeline: boolean): void {
  const resourceFiles = createResourceTemplates(name, {
    withPipeline,
  });
  for (const [fileName, content] of Object.entries(resourceFiles)) {
    files[`src/modules/users/${fileName}`] = content;
  }
}

function createApplicationTemplate(): string {
  return `import {
  Application,
  ExpressX,
  ExpressXApp,
  ExpressXLogger,
  OnInitExpressXApp,
} from '@expressxjs/core';
import express from 'express';

const logger = new ExpressXLogger();

@Application()
export class MyApplication extends ExpressX {
  public async preInit(): Promise<void> {
    // Connect databases, caches, and message brokers here.
  }

  public async onInit(app: OnInitExpressXApp): Promise<void> {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  }

  public postInit(app: ExpressXApp): void {
    void app;
    logger.success('Application initialized', 'Bootstrap');
  }
}
`;
}

function createBootstrapTemplate(projectName: string, applicationClassName: string): string {
  return `import { ExpressXFactory, ExpressXLogger } from '@expressxjs/core';
import { createServer } from 'node:http';
import { parseArgs } from 'node:util';
import { ${applicationClassName} } from './application';

const logger = new ExpressXLogger();

async function bootstrap(): Promise<void> {
  const { values } = parseArgs({
    options: { port: { type: 'string', short: 'p' } },
    strict: false,
  });
  const port = Number(values.port ?? process.env.PORT ?? 3000);
  const app = await ExpressXFactory.createApp<${applicationClassName}>();
  const server = createServer(app);

  server.listen(port, () => {
    logger.success('${projectName} running on http://localhost:' + port, 'Bootstrap');
  });
}

bootstrap().catch((error: unknown) => {
  const cause = error instanceof Error ? error : String(error);
  logger.error('Failed to start application', 'Bootstrap', cause);
  process.exitCode = 1;
});
`;
}

function createExceptionHandlerTemplate(): string {
  return `import {
  ExceptionHandler,
  HttpErrorResponse,
  UseGlobalExceptionHandler,
} from '@expressxjs/core';

@UseGlobalExceptionHandler()
export class AppExceptionHandler extends ExceptionHandler {
  public catch(error: unknown): HttpErrorResponse {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const statusCode = message.startsWith('Unauthorized') ? 401 : 500;
    return new HttpErrorResponse(statusCode, { message, statusCode });
  }
}
`;
}

function createMiddlewareTemplate(): string {
  return `import {
  ExpressXLogger,
  ExpressXMiddleware,
  HttpContext,
  NextFn,
} from '@expressxjs/core';

const logger = new ExpressXLogger();

export class RequestLoggerMiddleware extends ExpressXMiddleware {
  public use(ctx: HttpContext, next: NextFn): void {
    logger.info(\`[\${ctx.req.method}] \${ctx.req.originalUrl}\`, 'Request');
    next();
  }
}
`;
}

function createInterceptorTemplate(): string {
  return `import { ExpressXInterceptor, Handler, HttpContext } from '@expressxjs/core';

export class TimingInterceptor extends ExpressXInterceptor {
  public async intercept(ctx: HttpContext, callHandler: Handler): Promise<unknown> {
    const startedAt = Date.now();
    const result = await callHandler.handle();
    ctx.res.setHeader('x-response-time', \`\${Date.now() - startedAt}ms\`);
    return result;
  }
}
`;
}

function createGlobalInterceptorTemplate(): string {
  return `import {
  ExpressXInterceptor,
  Handler,
  HttpContext,
  HttpResponse,
  UseGlobalInterceptor,
} from '@expressxjs/core';

@UseGlobalInterceptor()
export class ResponseEnvelopeInterceptor extends ExpressXInterceptor {
  public async intercept(ctx: HttpContext, callHandler: Handler): Promise<unknown> {
    const result = await callHandler.handle();
    if (!(result instanceof HttpResponse)) return result;

    return new HttpResponse(result.code, {
      success: true,
      data: result.data,
      path: ctx.req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
`;
}

function createReadme(projectName: string, template: ProjectTemplate, filePaths: string[]): string {
  const sourceFiles = filePaths
    .filter((filePath) => filePath.startsWith('src/'))
    .sort()
    .map((filePath) => `- \`${filePath}\``)
    .join('\n');

  return `# ${projectName}

ExpressX application generated with the **${template}** template.

## Start the application

\`\`\`bash
npm install
npm run dev
\`\`\`

The example API is available at \`http://localhost:3000/users\`.

## Production build

\`\`\`bash
npm run build
npm start
\`\`\`

## Generate code

\`\`\`bash
# A complete feature with controller, service, and DTO
npx expressx generate resource Product

# Individual components
npx expressx generate controller Health
npx expressx generate service Notification
npx expressx generate guard Auth
\`\`\`

## Generated source

${sourceFiles}
`;
}

function runSetupCommand(command: string, args: string[], cwd: string, label: string): void {
  logger.info(`${label}: running ${command} ${args.join(' ')}`, 'Project');
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    logger.warn(`${label} setup did not complete. You can run "${command} ${args.join(' ')}" manually.`, 'Project');
  }
}

function printNextSteps(projectName: string, options: CreateProjectOptions): void {
  logger.info(`Next step: cd ${projectName}`, 'Project');
  if (options.skipInstall) logger.info('Next step: npm install', 'Project');
  if (options.skipGit) logger.info('Optional next step: git init', 'Project');
  logger.info('Next step: npm run dev', 'Project');
}
