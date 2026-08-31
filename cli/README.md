# ExpressX CLI

<div align="center">

<!-- ![ExpressX CLI](https://img.shields.io/badge/ExpressX-CLI-blue?style=for-the-badge) -->

[▶ Watch demo video](https://github.com/aymansainshy/expressXjs-Cli/blob/main/usage/cli-usage.mov)

**Modern, decorator-based Express.js framework with powerful CLI tooling**

[Getting Started](#-getting-started) • [Commands](#-commands) • [Examples](#-examples) • [Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Installation](#-installation)
- [Getting Started](#-getting-started)
- [Commands](#-commands)
  - [expressx new](#expressx-new)
  - [expressx dev](#expressx-dev)
  - [expressx build](#expressx-build)
  - [expressx generate](#expressx-generate)
  - [expressx help](#expressx-help)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Examples](#-examples)
- [Debugging](#-debugging)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

ExpressX CLI is a command-line interface tool for creating, developing, and building ExpressX applications. It provides scaffolding, code generation, hot-reload development server, and production build capabilities.

ExpressX is a modern Express.js framework that uses TypeScript decorators for routing, dependency injection, and application structure - inspired by NestJS but lighter and more flexible.

---

## ✨ Features

- **Quick Project Setup** - Create new projects with multiple templates
- **Hot Reload** - Auto-restart on file changes during development
- **Code Generation** - Generate controllers, services, middlewares, and more
- **Built-in Debugging** - Full Node.js debugging support (`--inspect`, profiling, etc.)
- **Smart Caching** - Intelligent decorator file tracking for fast startup
- **TypeScript First** - Full TypeScript support with decorator metadata
- **Production Ready** - Optimized builds for deployment
- **Rich CLI Help** - Comprehensive help for every command

---

## Installation

### Global Installation (Recommended)

```bash
NOT available yet .
npm install -g @expressx/cli
```

### Local Installation

```bash
NOT available yet .
npm install --save-dev @expressx/cli
```

### Verify Installation

```bash
expressx --version
```

---

## Getting Started

### Create a New Project

```bash
# Create a basic project
expressx new my-app

# Navigate to project
cd my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

Your app will be running at `http://localhost:3000`!

### Your First Controller

The generated project includes an example controller:

```typescript
// src/app.controller.ts
import { Controller, Get } from "@expressx/core";

@Controller("/api")
export class AppController {
  @GET("/")
  async index() {
    return {
      message: "Welcome to my-app!",
      version: "1.0.0",
    };
  }

  @GET("/health")
  async health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
```

Visit `http://localhost:3000/api` to see it in action!

---

## Commands

### `expressx new`

Create a new ExpressX project with complete scaffolding.

#### Syntax

```bash
expressx new <project-name> [options]
expressx create <project-name> [options]  # alias
```

#### Options

| Option                  | Description                                 | Default   |
| ----------------------- | ------------------------------------------- | --------- |
| `-t, --template <type>` | Project template (`default`, `api`, `full`) | `default` |
| `--skip-install`        | Skip `npm install`                          | `false`   |
| `--skip-git`            | Skip git initialization                     | `false`   |

#### Templates

**`default`** - Basic project structure

```
my-app/
├── src/
│   ├── main.ts              # Application entry
│   └── app.controller.ts    # Example controller
├── package.json
├── tsconfig.json
└── README.md
```

**`api`** - REST API focused

```
my-api/
├── src/
│   ├── main.ts
│   └── users.controller.ts  # CRUD operations
└── ...
```

**`full`** - Complete folder structure

```
my-app/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   ├── interceptors/
│   └── main.ts
└── ...
```

#### Examples

```bash
# Basic project
expressx new my-app

# API template
expressx new my-api --template api

# Full template, skip install
expressx new my-app -t full --skip-install

# For CI/CD
expressx new my-app --skip-install --skip-git
```

---

### `expressx dev`

Start development server with hot-reload and file watching.

#### Syntax

```bash
expressx dev [node-flags] [app-flags]
expressx start [node-flags] [app-flags]  # alias
```

#### Features

- 🔥 **Hot Reload** - Auto-restart on file changes
- 📦 **Cache Management** - Tracks decorator files
- 🔍 **File Watching** - Monitors `src/**/*.ts`
- 🐛 **Debug Support** - All Node.js debugging flags
- ⚡ **Fast Restart** - Only reloads what changed

#### Node.js Flags (Passed to Node.js)

| Flag                          | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `--inspect[=host:port]`       | Enable debugging (default: 127.0.0.1:9229)    |
| `--inspect-brk[=host:port]`   | Enable debugging and break before code starts |
| `--max-old-space-size=<size>` | Set max heap size in MB                       |
| `--expose-gc`                 | Expose garbage collection                     |
| `--trace-warnings`            | Show stack traces for warnings                |
| `--cpu-prof`                  | Start CPU profiling                           |
| `--heap-prof`                 | Start heap profiling                          |

#### Application Flags (Passed to Your App)

| Flag                  | Description       |
| --------------------- | ----------------- |
| `--port <port>`       | Application port  |
| `--host <host>`       | Application host  |
| `--env <environment>` | Environment name  |
| `--verbose`           | Verbose logging   |
| `--workers <count>`   | Number of workers |

#### Examples

```bash
# Basic development
expressx dev

# With debugging
expressx dev --inspect

# Debug with break
expressx dev --inspect-brk

# Custom port
expressx dev --port 5000

# Increase memory + custom port
expressx dev --max-old-space-size=4096 --port 3000

# Production-like development
NODE_ENV=production expressx dev --port 8080

# Debug + profiling
expressx dev --inspect --cpu-prof --heap-prof

# Full debug setup
expressx dev --inspect-brk --trace-warnings --max-old-space-size=8192 --port 3000 --verbose
```

#### What You'll See

```

██████████████████████████████████████████████████████████╗     ╔██████████████████╗
╚═══════════════════════════════════════════════════════███╗   ╔███╔═══════════════╝
███████╗██╗  ██╗██████╗ ██████╗ ███████╗███████╗███████╗ ╚██╗  ██╔═╝    ██╗███████╗
██╔════╝╚██╗██╔╝██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝  ╚██╗██╔╝      ██║██╔════╝
█████╗   ╚███╔╝ ██████╔╝██████╔╝█████╗  ███████╗███████╗   ╚███╔╝       ██║███████╗
██╔══╝   ██╔██╗ ██╔═══╝ ██╔══██╗██╔══╝  ╚════██║╚════██║   ██╔██╗   ██   ██║╚════██║
███████╗██╔╝ ██╗██║     ██║  ██║███████╗███████║███████║ ███╔╝╚███╗ ╚█████╔╝███████║
╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝ ╚══╝  ╚══╝  ╚════╝ ╚══════╝

╔══════════════════════════════════════════════════════════════════════════════════╗
║     ExpressXjs • Auto-Configuration • Decorators • Express Performance ⚡        ║
╚══════════════════════════════════════════════════════════════════════════════════╝



02/08/2026 19:51:04  INFO  [ExpressX] [.expressx/cache.json] .expressx.cache is up-to-date! No changes detected.
02/08/2026 19:51:04  INFO  [ExpressX] [.expressx/cache.json] Total decorator files: 4,  Last updated: 10 minute(s) ago
02/08/2026 19:51:04  INFO  [ExpressX] [doctor] ExpressXjs Doctor: Checking your environment...
02/08/2026 19:51:04  INFO  [ExpressX] [doctor] Entry File
02/08/2026 19:51:04  INFO  [ExpressX] [doctor] Runtime Entry
02/08/2026 19:51:04  INFO  [ExpressX] [Startup] Starting application, Entry file: /Users/development/myPoroject/src/index.ts

02/08/2026 19:51:04  INFO  [ExpressX] [watcher] Start Watching file : src/**/*.ts

02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @Application decorator to class "MyApplication" with options: {}
02/08/2026 19:51:05  SUCCESS  [ExpressX] [Startup] .expressx/cache.json loaded successfully
02/08/2026 19:51:05  DEBUG  [ExpressX] [.expressx/cache.json] .expressx/cache.json version: 1.0.0
02/08/2026 19:51:05  DEBUG  [ExpressX] [.expressx/cache.json] Environment: development
02/08/2026 19:51:05  DEBUG  [ExpressX] [.expressx/cache.json] Total files scanned: 5
02/08/2026 19:51:05  DEBUG  [ExpressX] [.expressx/cache.json] Decorator files: 4
02/08/2026 19:51:05  DEBUG  [ExpressX] [.expressx/cache.json] Generated: 2/8/2026, 7:40:55 PM
02/08/2026 19:51:05  INFO  [ExpressX] [Importing file] ├─ /Users/development/myPoroject/src/test.ts
02/08/2026 19:51:05  INFO  [ExpressX] [Importing file] ├─ /Users/development/myPoroject/src/interceptors.ts
02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @UseGlobalInterceptor decorator to class "GlobalLogginInterceptor"
02/08/2026 19:51:05  INFO  [ExpressX] [Importing file] ├─ /Users/development/myPoroject/src/controller.ts
02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @body decorator to method "getUsers" in class "UserController"
02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @res decorator to method "getUsers" in class "UserController"
02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @req decorator to method "getUsers" in class "UserController"
02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @UseInterceptors decorator to classs: ResponseEnvelopeInterceptor in method "getUsers" of class "UserController"
02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @GET decorator to method "getUsers" in class "UserController" with path: /
02/08/2026 19:51:05  DEBUG  [ExpressX] [Decorator] Applying @Controller decorator to class "UserController" with path: /users
02/08/2026 19:51:05  INFO  [ExpressX] [Importing file] ├─ /Users/development/myPoroject/src/application.ts
02/08/2026 19:51:05  INFO  [ExpressX] [Importing files] All files imported in 127ms

Pre-initialization logic here.
On initialization logic here.
Global Interceptors Resolved:  [ GlobalLogginInterceptor {} ]
Post-initialization logic here.
Setting up routes...
[ExpressX] Server running on http://localhost:3000

```

---

### `expressx build`

Build the application for production deployment.

#### Syntax

```bash
expressx build [options]
```

#### Options

| Option               | Description          | Default |
| -------------------- | -------------------- | ------- |
| `-o, --output <dir>` | Output directory     | `dist`  |
| `--verbose`          | Detailed build info  | `false` |
| `--sourcemap`        | Generate source maps | `false` |

#### What It Does

1. ✅ Scans all TypeScript files
2. ✅ Detects files with decorators
3. ✅ Creates development cache: `src/.expressx/cache.json`
4. ✅ Generates production cache: `dist/.expressx/cache.json`
5. ✅ Converts `.ts` paths → `.js` paths

#### Examples

```bash
# Basic build
expressx build

# Custom output
expressx build --output build

# Verbose mode
expressx build --verbose

# Complete build workflow
expressx build && tsc
```

#### Output

```
🔨 ExpressX Build Process

════════════════════════════════════════════════════════════

📦 Step 1/2: Scanning source files...

💾 Development cache saved: src/.expressx/cache.json

📦 Step 2/2: Generating production cache...

✅ Production cache generated!
   Location: dist/.expressx/cache.json
   Files tracked: 12

════════════════════════════════════════════════════════════
✅ Build preparation complete!

💡 Next step: Run TypeScript compiler
   Command: tsc

📋 Remember to include dist/.expressx/ in your deployment!
```

---

### `expressx generate`

Generate boilerplate code for various components.

#### Syntax

```bash
expressx generate <type> <n> [path] [options]
expressx g <type> <n> [path] [options]  # alias
```

#### Types

| Type          | Description                 | File Pattern       |
| ------------- | --------------------------- | ------------------ |
| `controller`  | HTTP route handlers         | `*.controller.ts`  |
| `service`     | Business logic              | `*.service.ts`     |
| `middleware`  | Request/response processors | `*.middleware.ts`  |
| `interceptor` | Cross-cutting concerns      | `*.interceptor.ts` |
| `application` | Main application class      | `*.application.ts` |

#### Options

| Option          | Description                    |
| --------------- | ------------------------------ |
| `-d, --dry-run` | Preview without creating files |
| `-f, --force`   | Overwrite existing files       |

#### Naming Convention

- **Input**: `user-profile`
- **Class**: `UserProfileController`
- **File**: `user-profile.controller.ts`

#### Examples

```bash
# Generate controller
expressx generate controller User
expressx g controller User  # short

# Generate service
expressx g service Auth

# Generate middleware
expressx g middleware Logger

# Custom path
expressx g controller Product src/modules/products

# Dry run (preview)
expressx g controller User --dry-run

# Force overwrite
expressx g controller User --force

# Complete module
expressx g controller User src/modules/users
expressx g service User src/modules/users
expressx g middleware Auth src/modules/users
```

#### Generated Controller

```typescript
import { Controller, Get, Post, Put, Delete } from "@expressx/core";

@Controller("/user")
export class UserController {
  @GET("/")
  async index() {
    return { message: "List users" };
  }

  @GET("/:id")
  async show() {
    return { message: "Get user" };
  }

  @POST("/")
  async create() {
    return { message: "Create user" };
  }

  @PUT("/:id")
  async update() {
    return { message: "Update user" };
  }

  @DELET("/:id")
  async destroy() {
    return { message: "Delete user" };
  }
}
```

#### Generated Service

```typescript
import { Injectable } from "@expressx/core";

@Injectable()
export class AuthService {
  async execute() {
    return { success: true };
  }
}
```

#### Generated Middleware

```typescript
import { Middleware } from "@expressx/core";

@Middleware()
export class LoggerMiddleware {
  use(req: any, res: any, next: any) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  }
}
```

---

### `expressx help`

Display help information.

#### Syntax

```bash
expressx help [command]
expressx --help
expressx -h
```

#### Examples

```bash
# Main help
expressx help
expressx --help

# Command-specific help
expressx dev --help
expressx build --help
expressx generate --help

# Using help command
expressx help dev
expressx help generate
```

---

## ⚙️ Configuration

### package.json

ExpressX configuration is stored in `package.json`:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "expressx": {
    "sourceDir": "src",
    "outDir": "dist"
  },
  "scripts": {
    "dev": "expressx dev",
    "build": "expressx build && tsc",
    "start": "node dist/main.js",
    "generate": "expressx generate"
  },
  "dependencies": {
    "@expressx/core": "^1.0.0"
  },
  "devDependencies": {
    "@expressx/cli": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### tsconfig.json

Required TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node",
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Critical settings:**

- ✅ `experimentalDecorators: true`
- ✅ `emitDecoratorMetadata: true`

---

## 📁 Project Structure

### Default Template

```
my-app/
├── src/
│   ├── main.ts                   # Application entry point
│   └── app.controller.ts         # Example controller
├── node_modules/
├── dist/                         # Compiled output (after build)
│   └── .expressx/
│       └── cache.json           # Production cache
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Full Template

```
my-app/
├── src/
│   ├── controllers/
│   │   └── app.controller.ts
│   ├── services/
│   │   └── app.service.ts
│   ├── middlewares/
│   │   └── logger.middleware.ts
│   ├── interceptors/
│   ├── guards/
│   ├── models/
│   ├── utils/
│   ├── config/
│   ├── main.ts
│   └── .expressx/
│       └── cache.json            # Development cache
├── dist/
├── tests/
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 💡 Examples

### Complete Workflow

#### 1. Create Project

```bash
expressx new my-store -t full
cd my-store
npm install
```

#### 2. Generate Components

```bash
# Products module
expressx g controller Product src/modules/products
expressx g service Product src/modules/products
expressx g service Inventory src/modules/products

# Orders module
expressx g controller Order src/modules/orders
expressx g service Order src/modules/orders
expressx g service Payment src/modules/orders

# Auth
expressx g middleware Auth src/middleware
expressx g interceptor JwtValidator src/interceptors
```

#### 3. Development

```bash
# Start with debugging
expressx dev --inspect --port 3000
```

#### 4. Build & Deploy

```bash
# Build
expressx build
tsc

# Test production build locally
NODE_ENV=production node dist/main.js

# Deploy
rsync -av dist/ user@server:/app/
```

### E-commerce API Example

```bash
# Create project
expressx new ecommerce-api -t api
cd ecommerce-api
npm install

# Generate modules
expressx g controller Product src/modules/products
expressx g service Product src/modules/products
expressx g service ProductValidator src/modules/products

expressx g controller Cart src/modules/cart
expressx g service Cart src/modules/cart

expressx g controller Order src/modules/orders
expressx g service Order src/modules/orders
expressx g service PaymentProcessor src/modules/orders

expressx g middleware Auth src/middleware
expressx g middleware RateLimit src/middleware
expressx g interceptor Transform src/interceptors

# Start development
expressx dev --port 8080
```

### Microservice Example

```bash
# User Service
expressx new user-service -t api
cd user-service
expressx g controller User src
expressx g service UserRepository src
expressx g middleware JwtAuth src
expressx dev --port 3001

# Product Service
expressx new product-service -t api
cd product-service
expressx g controller Product src
expressx g service ProductRepository src
expressx dev --port 3002

# Gateway
expressx new api-gateway -t default
cd api-gateway
expressx g controller Gateway src
expressx g middleware Proxy src
expressx dev --port 3000
```

---

## 🐛 Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "ExpressX Dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to ExpressX",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Debug Workflow

#### 1. Start with --inspect

```bash
expressx dev --inspect
```

#### 2. Attach Debugger

- **VS Code**: Press `F5` → Select "Attach to ExpressX"
- **Chrome DevTools**: Navigate to `chrome://inspect`

#### 3. Set Breakpoints

- Click in the gutter of your code
- Debugger will pause on hot-reload

### Debug with Break

```bash
# Break before your code starts
expressx dev --inspect-brk

# Custom port
expressx dev --inspect-brk=0.0.0.0:9230
```

### Memory Debugging

```bash
# Increase heap size
expressx dev --max-old-space-size=4096

# Expose GC for manual control
expressx dev --expose-gc

# Take heap snapshots
expressx dev --heapsnapshot-signal=SIGUSR2
```

### Profiling

```bash
# CPU profiling
expressx dev --cpu-prof --cpu-prof-dir=./profiles

# Heap profiling
expressx dev --heap-prof --heap-prof-dir=./profiles

# Both
expressx dev --cpu-prof --heap-prof
```

Profiles are saved in `./profiles/` and can be analyzed in Chrome DevTools.

---

## 🚀 Deployment

### Standard Deployment

#### 1. Build

```bash
expressx build
tsc
```

#### 2. Verify Output

```bash
dist/
├── main.js
├── app.controller.js
├── user.service.js
└── .expressx/
    └── cache.json  # CRITICAL: Must be included!
```

#### 3. Deploy Files

```bash
# Copy to server
rsync -av dist/ user@server:/var/www/my-app/

# Or create tarball
tar -czf my-app.tar.gz dist/ package.json package-lock.json

# On server
tar -xzf my-app.tar.gz
npm install --production
NODE_ENV=production node dist/main.js
```

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy built application
COPY dist/ ./dist/

# ExpressX requires the cache file!
COPY dist/.expressx/ ./dist/.expressx/

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]
```

**Build & Run:**

```bash
# Build image
docker build -t my-app .

# Run container
docker run -p 3000:3000 -e NODE_ENV=production my-app
```

### PM2 Deployment

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [
    {
      name: "my-app",
      script: "./dist/main.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      time: true,
    },
  ],
};
```

**Deploy:**

```bash
# Build
expressx build && tsc

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs my-app
```

### Environment Variables

```bash
# Development
NODE_ENV=development
PORT=3000

# Production
NODE_ENV=production
PORT=8080
MAX_OLD_SPACE_SIZE=2048
```

---

## 🔧 Troubleshooting

### Cache Not Found Error

**Problem:**

```
❌ Cache not found - framework will create it on startup
```

**Solution:**

```bash
# Run build first
expressx build

# Then compile
tsc

# Or during development
expressx dev  # Creates cache automatically
```

### Decorator Metadata Error

**Problem:**

```
TypeError: Reflect.getMetadata is not a function
```

**Solution:**

Check `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Hot Reload Not Working

**Problem:** Files change but app doesn't restart

**Solution:**

1. Check file is in `src/**/*.ts`
2. Check file contains decorators
3. Try verbose mode:

```bash
expressx dev --verbose
```

### Port Already in Use

**Problem:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Use different port
expressx dev --port 3001

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### TypeScript Not Found

**Problem:**

```
zsh: command not found: tsc
```

**Solution:**

```bash
# Install TypeScript locally
npm install --save-dev typescript

# Use npx
npx tsc

# Or install globally
npm install -g typescript
```

### Import Errors in Production

**Problem:** Can't find modules after deployment

**Solution:**

Ensure `dist/.expressx/cache.json` is included:

```bash
# Verify it exists
ls -la dist/.expressx/

# If missing, rebuild
expressx build
tsc
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup

```bash
# Clone repository
git clone https://github.com/expressx/cli.git
cd cli

# Install dependencies
npm install

# Link for local testing
npm link

# Test your changes
expressx --version
```

### Running Tests

```bash
npm test
```

### Code Style

- Use TypeScript
- Follow existing code style
- Add tests for new features
- Update documentation

### Submit Pull Request

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT © ExpressX Team

---

## 📚 Resources

- **Documentation**: https://expressx.dev/docs
- **GitHub**: https://github.com/expressx/expressx
- **Issues**: https://github.com/expressx/expressx/issues
- **Discord**: https://discord.gg/expressx
- **Twitter**: https://twitter.com/expressx

---

## ⭐ Support

If you find ExpressX CLI helpful, please:

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 📖 Improve documentation
- 🤝 Contribute code

---

<div align="center">

**Made with ❤️ by the ExpressX Team**

[Website](https://github.com/aymansainshy/expressXjs) • [Docs](https://github.com/aymansainshy/expressXjs) • [GitHub](https://github.com/aymansainshy/expressXjs)

</div>
