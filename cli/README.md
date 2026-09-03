# ExpressX CLI

The official command-line toolkit for creating, developing, generating, and building [ExpressXjs](https://github.com/aymansainshy/expressXjs) applications.

## Install

```bash
npm install --global @expressxjs/cli
expressx --version
```

You can also install it locally:

```bash
npm install --save-dev @expressxjs/cli
npx expressx --help
```

## Create a project

```bash
expressx new my-api
cd my-api
npm run dev
```

The recommended `full` template is used by default. The CLI initializes Git and installs dependencies unless you disable those setup steps.

```bash
expressx new my-api --template full
expressx new my-api --template api
expressx new my-api --template default
expressx new my-api --skip-install --skip-git
```

| Template  | Includes                                                                                |
| --------- | --------------------------------------------------------------------------------------- |
| `default` | Application bootstrap and a complete users CRUD resource                                |
| `api`     | Default template plus global exception handling                                         |
| `full`    | API template plus guard, middleware, route interceptor, and global response interceptor |

The full scaffold uses a feature-first structure:

```text
my-api/
├── src/
│   ├── common/
│   │   ├── exceptions/app.exception-handler.ts
│   │   ├── guards/api-key.guard.ts
│   │   ├── interceptors/
│   │   │   ├── response-envelope.interceptor.ts
│   │   │   └── timing.interceptor.ts
│   │   └── middlewares/request-logger.middleware.ts
│   ├── modules/users/
│   │   ├── user.controller.ts
│   │   ├── user.dto.ts
│   │   └── user.service.ts
│   ├── application.ts
│   └── index.ts
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

The generated package contains the required ExpressX scanner configuration:

```json
{
  "expressx": {
    "sourceDir": "src",
    "outDir": "dist",
    "main": "src/index.ts"
  }
}
```

## Generate code

Generate a complete CRUD resource in one command:

```bash
expressx generate resource Product
# alias
expressx g r Product
```

This creates:

```text
src/modules/products/
├── product.controller.ts
├── product.dto.ts
└── product.service.ts
```

Generate individual components when you need finer control:

```bash
expressx generate controller Health
expressx generate service Notification
expressx generate middleware Logger
expressx generate interceptor Timing
expressx generate guard Auth
expressx generate exception App
expressx generate dto Account
expressx generate application Admin
```

Components are placed in conventional folders by default. Pass a relative path to choose another location:

```bash
expressx generate controller Product src/modules/catalog
```

Useful generation options:

```bash
expressx generate resource Product --dry-run
expressx generate resource Product --force
```

`--dry-run` previews every file without writing. `--force` overwrites an existing component or resource.

## Develop and build

```bash
# Hot reload
expressx dev

# Forward Node.js and application flags
expressx dev --inspect --port 4000
expressx dev --max-old-space-size=4096

# Build the scanner cache, then compile TypeScript
npm run build

# Run compiled output
npm start
```

The generated scripts are:

```json
{
  "scripts": {
    "dev": "expressx dev",
    "build": "expressx build && tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

## Command reference

```bash
expressx --help
expressx new --help
expressx generate --help
expressx dev --help
expressx build --help
```

## License

MIT
