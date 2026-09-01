#!/usr/bin/env node

import { Command } from 'commander';
import { verifyExpressXProject } from './utils/verfiyProject';
import { getEntrypoint } from './utils/getEntrypoint';
import { colors } from './constant/colors';
import { logger } from './constant/logger';
import { createProject } from './utils/createProject';
import { Generator } from './core/generator';
import { DevServer } from './core/devServer';
import { buildCommand } from './utils/builder';

const cliPackage = require('../package.json') as { version: string };
const program = new Command();

// --- CLI Configuration ---
program
  .name('expressx')
  .description('ExpressX CLI - Modern Express.js framework with decorators')
  .version(cliPackage.version)
  .addHelpText('after', `
${colors.bold('Examples:')}
  ${colors.cyan('$ expressx new MyApplication')}        Create a new project
  ${colors.cyan('$ expressx dev --inspect')}            Start dev server with debugging
  ${colors.cyan('$ expressx generate controller User')} Generate a controller
  ${colors.cyan('$ expressx build')}                    Build for production

${colors.bold('Documentation:')} 
 ${colors.green('https://github.com/aymansainshy/expressXjs')}

${colors.bold('Support:')}
 ${colors.green('https://github.com/aymansainshy/expressXjs/issues')}
`);

// --- Dev/Start Command ---
program
  .command('dev')
  .alias('start')
  .description('Start development server with hot-reload and file watching')
  .addHelpText('before', `
${colors.bold('Start Development Server')}

Runs your ExpressX application with automatic hot-reload when files change.
Supports all Node.js debugging and profiling flags.
`)
  .addHelpText('after', `
${colors.bold('Node.js Flags (passed to Node.js):')}
  --inspect[=host:port]           Enable inspector for debugging (default: 127.0.0.1:9229)
  --inspect-brk[=host:port]       Enable inspector and break before user code starts
  --max-old-space-size=<size>     Set maximum old space size in MB (e.g., 4096)
  --max-new-space-size=<size>     Set maximum new space size in MB
  --expose-gc                     Expose garbage collection
  --trace-warnings                Show stack traces on warnings
  --trace-deprecation             Show stack traces on deprecations
  --cpu-prof                      Start CPU profiling on startup
  --heap-prof                     Start heap profiling on startup

${colors.bold('Application Flags (passed to your app):')}
  --port <port>                   Application port (access via process.argv)
  --host <host>                   Application host
  --env <environment>             Environment name
  --workers <count>               Number of workers
  --verbose                       Verbose logging
  --debug                         Debug mode

${colors.bold('Examples:')}
  ${colors.cyan('$ expressx dev')}
    Start basic development server

  ${colors.cyan('$ expressx dev --inspect')}
    Start with Chrome DevTools debugging enabled

  ${colors.cyan('$ expressx dev --inspect-brk --port 3000')}
    Debug from start, run on port 3000

  ${colors.cyan('$ expressx dev --max-old-space-size=4096 --port 5000')}
    Start with 4GB heap size on port 5000

  ${colors.cyan('$ expressx dev --cpu-prof --heap-prof')}
    Start with CPU and heap profiling enabled

  ${colors.cyan('$ expressx dev --trace-warnings --verbose')}
    Show warnings with stack traces, verbose app logs

${colors.bold('Features:')}
  • Hot-reload on file changes
  • Intelligent cache management
  • Decorator file tracking
  • Debug reconnection on reload
  • Source map support
`)
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action(function (this: Command) {
    try {
      verifyExpressXProject();
      const entry = getEntrypoint();
      const rawArgs = process.argv.slice(3);
      const { nodeFlags, appFlags } = separateAllFlags(rawArgs);
      const server = new DevServer(entry, { nodeFlags, appFlags });
      server.start();
    } catch (err: any) {
      logger.error(err.message, 'CLI', err);
      process.exit(1);
    }
  });

// --- Build Command ---
program
  .command('build')
  .description('Build the application for production deployment')
  .option('-o, --output <dir>', 'Custom output directory (default: dist)')
  .option('--minify', 'Enable minification hint for bundler')
  .option('--sourcemap', 'Generate source maps')
  .option('--verbose', 'Show detailed build information')
  .addHelpText('before', `
${colors.bold('Build for Production')}

Scans your source files and generates optimized cache for production deployment.
Creates both development and production cache files.
`)
  .addHelpText('after', `
${colors.bold('What it does:')}
  1. Scans all TypeScript files in your source directory
  2. Detects files using ExpressX decorators
  3. Creates development cache: src/.expressx/cache.json
  4. Generates production cache: dist/.expressx/cache.json
  5. Converts TypeScript paths to JavaScript paths

${colors.bold('Examples:')}
  ${colors.cyan('$ expressx build')}
    Basic build with default settings

  ${colors.cyan('$ expressx build --output build')}
    Build to 'build' directory instead of 'dist'

  ${colors.cyan('$ expressx build --verbose')}
    Show detailed build information

  ${colors.cyan('$ expressx build --sourcemap')}
    Hint to generate source maps (configure in tsconfig.json)

  ${colors.cyan('$ expressx build && tsc')}
    Build cache then compile TypeScript

${colors.bold('After building:')}
  Run TypeScript compiler: ${colors.cyan('tsc')}
  
${colors.bold('Deployment:')}
  Ensure dist/.expressx/ is included in your deployment!
  This cache file is required for production runtime.

${colors.bold('Files created:')}
  • src/.expressx/cache.json  (development cache)
  • dist/.expressx/cache.json (production cache)
`)
  .action((options) => {
    try {
      buildCommand(options);
    } catch (err: any) {
      logger.error(err.message, 'CLI', err);
      process.exit(1);
    }
  });

// --- New/Create Command ---
program
  .command('new <project-name>')
  .alias('create')
  .description('Create a new ExpressX project with complete scaffolding')
  .option('-t, --template <template>', 'Project template: default, api, full (default: full)')
  .option('--skip-install', 'Skip npm install after creation')
  .option('--skip-git', 'Skip git initialization')
  .addHelpText('before', `
${colors.bold('Create New Project')}

Generates a complete ExpressX project with all necessary files,
configurations, and example code to get you started quickly.
`)
  .addHelpText('after', `
${colors.bold('Templates:')}
  ${colors.cyan('default')}  - Lean app with a complete users resource
  ${colors.cyan('api')}      - REST API plus global exception handling
  ${colors.cyan('full')}     - Production-style API with the complete request pipeline

${colors.bold('Examples:')}
  ${colors.cyan('$ expressx new my-app')}
    Create the recommended full project

  ${colors.cyan('$ expressx new my-api --template api')}
    Create REST API project

  ${colors.cyan('$ expressx new my-app -t full')}
    Create project with full folder structure

  ${colors.cyan('$ expressx new my-app --skip-install')}
    Create project without running npm install

  ${colors.cyan('$ expressx new my-app -t full --skip-install --skip-git')}
    Create full project, skip install and git init

${colors.bold('What gets created:')}
  • A runnable application and HTTP server entrypoint
  • A users resource with controller, service, DTO, and CRUD routes
  • Current ExpressX package configuration and production build scripts
  • TypeScript, environment, Git, and project documentation files

${colors.bold('Template: default')}
  Lean feature-first structure
  ├── src/application.ts
  ├── src/index.ts
  └── src/modules/users/

${colors.bold('Template: api')}
  Adds a global exception handler to the default API

${colors.bold('Template: full')}
  Adds an API-key guard, request logger, route timing interceptor,
  response envelope interceptor, and global exception handler

${colors.bold('Next steps after creation:')}
  ${colors.cyan('cd <project-name>')}
  ${colors.cyan('npm install')}        (only when using --skip-install)
  ${colors.cyan('npm run dev')}
`)
  .action((projectName: string, options: any) => {
    try {
      createProject(projectName, options);
    } catch (err: any) {
      logger.error(err.message, 'CLI', err);
      process.exit(1);
    }
  });

// --- Generate Command ---
program
  .command('generate <type> <name> [path]')
  .alias('g')
  .description('Generate boilerplate code for controllers, services, and more')
  .option('-d, --dry-run', 'Preview what would be generated without creating files')
  .option('-f, --force', 'Overwrite existing files')
  .addHelpText('before', `
${colors.bold('Generate Code Components')}

Quickly scaffold new components with consistent structure and naming.
Automatically applies PascalCase for classes and kebab-case for files.
`)
  .addHelpText('after', `
${colors.bold('Available Types:')}
  ${colors.cyan('controller')}   - HTTP route handler with decorators
  ${colors.cyan('service')}      - Business logic and data access
  ${colors.cyan('middleware')}   - Request/response processing
  ${colors.cyan('interceptor')}  - Cross-cutting concerns
  ${colors.cyan('guard')}        - Route authorization
  ${colors.cyan('exception')}    - Global exception handler
  ${colors.cyan('dto')}          - Create and update input types
  ${colors.cyan('application')}  - Main application class
  ${colors.cyan('resource')}     - Controller, service, and DTO together

${colors.bold('Examples:')}
  ${colors.cyan('$ expressx generate controller User')}
    Creates: src/controllers/user.controller.ts

  ${colors.cyan('$ expressx g service Auth')}
    Creates: src/services/auth.service.ts

  ${colors.cyan('$ expressx g middleware Logger')}
    Creates: src/middlewares/logger.middleware.ts

  ${colors.cyan('$ expressx g resource Product')}
    Creates a CRUD feature in src/modules/products/

  ${colors.cyan('$ expressx g controller Product src/modules/products')}
    Creates: src/modules/products/product.controller.ts

  ${colors.cyan('$ expressx g controller User --dry-run')}
    Preview without creating (shows file path and content)

  ${colors.cyan('$ expressx g controller User --force')}
    Overwrite if file already exists

  ${colors.cyan('$ expressx g service User -d')}
    Dry run with short flag

${colors.bold('Naming Convention:')}
  Input: "user-profile"
  Class: UserProfileController
  File:  user-profile.controller.ts

${colors.bold('Workflow Example:')}
  Create a complete product module in one command:
  ${colors.cyan('$ expressx g resource Product')}
  ${colors.cyan('$ expressx g guard Admin')}
`)
  .action((type: string, name: string, customPath?: string, options?: any) => {
    try {
      verifyExpressXProject();

      const generator = new Generator();
      generator.generate(type, name, customPath, options);
    } catch (err: any) {
      logger.error(err.message, 'CLI', err);
      process.exit(1);
    }
  });

// --- Help Command ---
program
  .command('help [command]')
  .description('Display help information for a command')
  .action((command?: string) => {
    if (command) {
      const cmd = program.commands.find(c => c.name() === command);
      if (cmd) {
        cmd.help();
      } else {
        logger.error(`Unknown command: ${command}`, 'CLI');
        program.help();
      }
    } else {
      program.help();
    }
  });

/**
 * ALL_NODE_FLAGS - Comprehensive list of Node.js flags
 */
const ALL_NODE_FLAGS = new Set([
  '--inspect', '--inspect-brk', '--inspect-port', '--inspect-publish-uid',
  '--debug', '--debug-brk', '--debug-port',
  '--max-old-space-size', '--max-new-space-size', '--max-semi-space-size',
  '--max-http-header-size', '--max-string-length',
  '--expose-gc', '--gc-global', '--gc-interval',
  '--trace-warnings', '--trace-deprecation', '--trace-sync-io',
  '--trace-events-enabled', '--trace-event-categories', '--trace-event-file-pattern',
  '--trace-exit', '--trace-sigint', '--trace-uncaught',
  '--no-warnings', '--no-deprecation', '--throw-deprecation',
  '--pending-deprecation', '--no-force-async-hooks-checks',
  '--require', '--import', '--loader', '--experimental-loader',
  '--input-type', '--experimental-modules',
  '--es-module-specifier-resolution', '--experimental-specifier-resolution',
  '--experimental-json-modules', '--experimental-wasm-modules',
  '--experimental-top-level-await', '--experimental-vm-modules',
  '--experimental-worker', '--experimental-report',
  '--experimental-import-meta-resolve',
  '--cpu-prof', '--cpu-prof-name', '--cpu-prof-interval', '--cpu-prof-dir',
  '--heap-prof', '--heap-prof-name', '--heap-prof-interval', '--heap-prof-dir',
  '--perf-prof', '--perf-basic-prof', '--perf-basic-prof-only-functions',
  '--prof', '--prof-process', '--stack-trace-limit',
  '--heapsnapshot-signal', '--heapsnapshot-near-heap-limit',
  '--v8-pool-size', '--zero-fill-buffers', '--track-heap-objects',
  '--interpreted-frames-native-stack', '--jitless',
  '--experimental-policy', '--policy-integrity',
  '--secure-heap', '--secure-heap-min',
  '--disable-proto', '--disallow-code-generation-from-strings',
  '--frozen-intrinsics',
  '--tls-cipher-list', '--tls-min-v1.0', '--tls-min-v1.1',
  '--tls-min-v1.2', '--tls-min-v1.3', '--tls-max-v1.2', '--tls-max-v1.3',
  '--use-openssl-ca', '--use-bundled-ca', '--openssl-config',
  '--icu-data-dir', '--experimental-global-webcrypto',
  '--enable-source-maps',
  '--report-compact', '--report-dir', '--report-filename',
  '--report-on-fatalerror', '--report-on-signal', '--report-signal',
  '--report-uncaught-exception', '--report-directory',
  '--async-stack-traces',
  '--snapshot-blob', '--build-snapshot',
  '--diagnostic-dir', '--redirect-warnings',
  '--abort-on-uncaught-exception', '--abort-signal-uncaught',
  '--dns-result-order',
  '--unhandled-rejections',
  '--title',
  '--preserve-symlinks', '--preserve-symlinks-main',
  '--conditions', '--experimental-network-imports',
  '--experimental-repl-await',
  '--watch', '--watch-path', '--watch-preserve-output',
  '--test', '--test-only', '--test-name-pattern', '--test-reporter',
  '--test-reporter-destination',
  '--force-context-aware', '--force-fips', '--pending-deprecation',
  '--no-addons', '--no-global-search-paths', '--node-memory-debug',
  '--openssl-legacy-provider', '--openssl-shared-config',
  '--huge-max-old-generation-size', '--security-revert',
]);

function isNodeFlag(flag: string): boolean {
  const flagName = flag.split('=')[0];
  if (ALL_NODE_FLAGS.has(flagName)) return true;

  for (const nodeFlag of ALL_NODE_FLAGS) {
    if (flagName === nodeFlag || flag.startsWith(nodeFlag + '=')) return true;
  }

  if (
    flagName.startsWith('--v8-') ||
    flagName.startsWith('--harmony') ||
    flagName.startsWith('--trace-') ||
    flagName.startsWith('--max-') ||
    flagName.startsWith('--experimental-') ||
    flagName.startsWith('--diagnostic-') ||
    flagName.includes('-prof') ||
    flagName.includes('heap') ||
    flagName.includes('snapshot')
  ) return true;

  return false;
}

function separateAllFlags(rawArgs: string[]): { nodeFlags: string[]; appFlags: string[] } {
  const nodeFlags: string[] = [];
  const appFlags: string[] = [];

  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg.startsWith('-')) {
      if (isNodeFlag(arg)) {
        nodeFlags.push(arg);
        if (!arg.includes('=') && i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
          const flagsTakingValues = ['--require', '--import', '--loader', '--experimental-loader',
            '--conditions', '--title', '--redirect-warnings', '--report-dir', '--report-filename',
            '--diagnostic-dir', '--cpu-prof-dir', '--heap-prof-dir', '--openssl-config',
            '--icu-data-dir', '--dns-result-order', '--unhandled-rejections'];

          if (flagsTakingValues.includes(arg)) {
            nodeFlags.push(rawArgs[i + 1]);
            i++;
          }
        }
      } else {
        appFlags.push(arg);
        if (!arg.includes('=') && i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
          appFlags.push(rawArgs[i + 1]);
          i++;
        }
      }
    } else {
      appFlags.push(arg);
    }
    i++;
  }

  return { nodeFlags, appFlags };
}

// --- Parse Arguments ---
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
