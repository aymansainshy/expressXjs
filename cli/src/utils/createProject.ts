import path from 'path';
import fs from 'fs';
import { colors } from '../constant/colors';
import { logger } from '../constant/logger';
import { toPascalCase } from './toPascalCase';

export interface CreateProjectOptions {
  template?: 'default' | 'api' | 'full';
  skipInstall?: boolean;
  skipGit?: boolean;
}

// --- Project Scaffolding ---
export function createProject(projectName: string, options: CreateProjectOptions = {}): void {
  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    logger.error(`Directory already exists: ${projectName}`, 'Project');
    process.exit(1);
  }

  const template = options.template || 'default';
  const skipInstall = options.skipInstall || false;
  const skipGit = options.skipGit || false;

  logger.info(`Creating new ExpressX project "${projectName}" (template: ${template})`, 'Project');
  if (skipInstall) logger.debug('Skipping npm install', 'Project');
  if (skipGit) logger.debug('Skipping git initialization', 'Project');

  // Create directory structure
  fs.mkdirSync(projectPath);
  fs.mkdirSync(path.join(projectPath, 'src'));
  logger.debug(`Created project directory: ${projectPath}`, 'Project');

  // Template-specific directories
  if (template === 'full') {
    fs.mkdirSync(path.join(projectPath, 'src', 'controllers'));
    fs.mkdirSync(path.join(projectPath, 'src', 'services'));
    fs.mkdirSync(path.join(projectPath, 'src', 'middlewares'));
    fs.mkdirSync(path.join(projectPath, 'src', 'interceptors'));
    logger.debug('Created full-template folder structure', 'Project');
  }

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: `ExpressX application - ${template} template`,
    main: 'dist/index.js',
    scripts: {
      dev: 'expressx start',
      build: 'tsc',
      start: 'node dist/index.js',
      'generate:controller': 'expressx generate controller',
      'generate:service': 'expressx generate service'
    },
    dependencies: {
      '@expressx/core': '^1.0.0'
    },
    devDependencies: {
      '@expressx/cli': '^1.0.0',
      '@types/node': '^20.0.0',
      'typescript': '^5.0.0',
      'ts-node': '^10.9.0'
    }
  };

  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      moduleResolution: 'node',
      declaration: true,
      declarationMap: true,
      sourceMap: true
    },
    include: ['src'],
    exclude: ['node_modules', 'dist']
  };

  fs.writeFileSync(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // Create .gitignore (unless skipped)
  if (!skipGit) {
    const gitignore = `node_modules/
dist/
*.log
.env
.DS_Store
`;
    fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignore);
  }

  // Create main application file based on template
  if (template === 'api') {
    createApiTemplate(projectPath, projectName);
  } else if (template === 'full') {
    createFullTemplate(projectPath, projectName);
  } else {
    createDefaultTemplate(projectPath, projectName);
  }

  // Create README
  const readme = `# ${projectName}

A new ExpressX application (${template} template).

## Getting Started

\`\`\`bash
# Install dependencies
${skipInstall ? '# (skipped)' : 'npm install'}

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
\`\`\`

## Generate Code

\`\`\`bash
# Generate controller
expressx generate controller User

# Generate service
expressx generate service Auth

# Generate middleware
expressx generate middleware Logger
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── main.ts              # Application entry point
│   └── app.controller.ts    # Example controller
├── package.json
├── tsconfig.json
└── README.md
\`\`\`
`;

  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);

  logger.success(`Project "${projectName}" created successfully`, 'Project');

  console.log(colors.bold('\nNext steps:\n'));
  console.log(colors.cyan(`  cd ${projectName}`));

  if (!skipInstall) {
    console.log(colors.cyan('  npm install'));
  }

  if (!skipGit) {
    console.log(colors.cyan('  git init'));
  }

  console.log(colors.cyan('  npm run dev\n'));
}

function createDefaultTemplate(projectPath: string, projectName: string): void {
  const mainApp = `import { ExpressX, Application } from '@expressx/core';

@Application({
  port: 3000
})
export class ${toPascalCase(projectName)}App extends ExpressX {
  async onInit() {
    console.log('🚀 ${projectName} is starting...');
  }

  async onReady() {
    console.log('✅ ${projectName} is ready!');
    console.log(\`🌍 Server running at http://localhost:\${this.config.port}\`);
  }
}
`;

  fs.writeFileSync(path.join(projectPath, 'src', 'main.ts'), mainApp);

  const exampleController = `import { Controller, Get } from '@expressx/core';

@Controller('/api')
export class AppController {
  @Get('/')
  async index() {
    return {
      message: 'Welcome to ${projectName}!',
      version: '1.0.0'
    };
  }

  @Get('/health')
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
`;

  fs.writeFileSync(path.join(projectPath, 'src', 'app.controller.ts'), exampleController);
}

function createApiTemplate(projectPath: string, projectName: string): void {
  // API template with more REST endpoints
  const mainApp = `import { ExpressX, Application } from '@expressx/core';

@Application({
  port: 3000,
  cors: true,
  json: true
})
export class ${toPascalCase(projectName)}App extends ExpressX {
  async onInit() {
    console.log('🚀 ${projectName} API is starting...');
  }

  async onReady() {
    console.log('✅ ${projectName} API is ready!');
    console.log(\`🌍 API running at http://localhost:\${this.config.port}\`);
  }
}
`;

  fs.writeFileSync(path.join(projectPath, 'src', 'main.ts'), mainApp);

  const apiController = `import { Controller, Get, Post, Put, Delete } from '@expressx/core';

  @Controller('/user')
  export class UserController {
    @GET('/') 
    async getAll(@Req() req: Request): Promise<HttpResponse | any> { }

    @GET('/:id') 
    async getById(@Req() req: Request): Promise<HttpResponse | any> { }

    @POST('/') 
    async create(@Req() req: Request): Promise<HttpResponse | any> { }

    @PUT('/:id')
    async update(@Req() req: Request): Promise<HttpResponse | any> { }

    @DELETE('/:id') 
    async destroy(@Req() req: Request): Promise<HttpResponse | any> { }
  }
`;

  fs.writeFileSync(path.join(projectPath, 'src', 'app.controller.ts'), apiController);
}

function createFullTemplate(projectPath: string, projectName: string): void {
  // Full template with organized structure
  const mainApp = `import { ExpressX, Application } from '@expressx/core';

@Application({
  port: 3000,
  cors: true,
  json: true
})
export class ${toPascalCase(projectName)}App extends ExpressX {
  async onInit() {
    console.log('🚀 ${projectName} is starting...');
  }

  async onReady() {
    console.log('✅ ${projectName} is ready!');
    console.log(\`🌍 Server running at http://localhost:\${this.config.port}\`);
  }
}
`;

  fs.writeFileSync(path.join(projectPath, 'src', 'main.ts'), mainApp);

  // Create example files in subdirectories
  const controller = `import { Controller, Get } from '@expressx/core';
import { AppService } from '../services/app.service';

@Controller('/api')
export class AppController {
  constructor(private appService: AppService) {}

  @Get('/')
  async index() {
    return this.appService.getInfo();
  }
}
`;

  const service = `import { Injectable } from '@expressx/core';

@Injectable()
export class AppService {
  getInfo() {
    return {
      message: 'Welcome to ${projectName}!',
      version: '1.0.0'
    };
  }
}
`;

  const middleware = `import { Middleware } from '@expressx/core';

@Middleware()
export class LoggerMiddleware {
  use(req: any, res: any, next: any) {
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
    next();
  }
}
`;

  fs.writeFileSync(path.join(projectPath, 'src', 'controllers', 'app.controller.ts'), controller);
  fs.writeFileSync(path.join(projectPath, 'src', 'services', 'app.service.ts'), service);
  fs.writeFileSync(path.join(projectPath, 'src', 'middlewares', 'logger.middleware.ts'), middleware);
}