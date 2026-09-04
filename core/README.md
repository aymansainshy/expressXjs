# ExpressX Core

ExpressX Core is a lightweight, object-oriented framework built on Express. It adds decorator-based routing, dependency injection, lifecycle hooks, request pipelines, automatic source scanning, and structured HTTP responses while keeping the underlying Express application available.

Its auto-configuration model is inspired by Spring Boot: describe the role of a class with a decorator and let ExpressX discover, register, and connect it when the application starts. ExpressX keeps the flexibility and runtime behavior of Express; it is not a port of Spring Boot and does not attempt to reproduce the Spring API.

## Auto-configuration, inspired by Spring Boot

ExpressX favors convention over manual registration. Instead of maintaining one central file that imports every controller and global component, you declare the application structure where it belongs:

| Declaration                    | What ExpressX configures automatically                               |
| ------------------------------ | -------------------------------------------------------------------- |
| `@Application()`               | The application lifecycle class used during bootstrap                |
| `@Controller()`                | Controller instances and their decorated HTTP routes                 |
| `@UseGlobalInterceptor()`      | An interceptor that wraps every registered route                     |
| `@UseGlobalExceptionHandler()` | The application-wide exception handler                               |
| Injection decorators           | Constructor dependencies through the ExpressX dependency container   |
| Route pipeline decorators      | Guards, middleware, interceptors, and parameter resolution per route |

During bootstrap, ExpressX reads the project configuration, imports the discovered modules, allows their decorators to register metadata, resolves dependencies, builds the request pipeline, and runs the application lifecycle hooks. The result is a ready-to-use Express application without a hand-written component registry.

## Install

The fastest way to start is with the ExpressX CLI:

```bash
npx @expressxjs/cli new my-api
cd my-api
npm run dev
```

For an existing TypeScript project, install Core and the CLI directly:

```bash
npm install @expressxjs/core express
npm install --save-dev @expressxjs/cli typescript @types/node
```

## Project configuration

ExpressX scans the source directory for applications, controllers, global interceptors, and global exception handlers. Add the scanner configuration and scripts to `package.json`:

```json
{
  "type": "commonjs",
  "scripts": {
    "dev": "expressx dev",
    "build": "expressx build && tsc",
    "start": "node dist/index.js"
  },
  "expressx": {
    "sourceDir": "src",
    "outDir": "dist",
    "main": "src/index.ts"
  }
}
```

The `expressx` fields tell the CLI and Core where each stage of the application lives:

| Field       | Purpose                                                          |
| ----------- | ---------------------------------------------------------------- |
| `sourceDir` | TypeScript source directory scanned during development and build |
| `outDir`    | Compiled JavaScript directory used in production                 |
| `main`      | Application entry point started by `expressx dev`                |

Enable decorators in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

## `.expressx/cache.json`: the discovery manifest

`.expressx/cache.json` is the core of ExpressX's auto-configuration design. Despite its name, it is not merely a disposable performance cache: it is a generated discovery manifest that tells ExpressX which modules contain framework-level decorators and must be imported during startup.

This manifest is the bridge between declarative classes and a running application:

```text
Decorated TypeScript files
          |
          v
   ExpressX scanner
          |
          v
<sourceDir>/.expressx/cache.json
          |
          | expressx build maps .ts paths to compiled .js paths
          v
<outDir>/.expressx/cache.json
          |
          v
ExpressX imports modules -> decorators register metadata -> application is assembled
```

Without the manifest, an application would need either an explicit import and registration list or a recursive filesystem scan on every production startup. ExpressX generates that list ahead of time, then imports only the files needed to activate application, controller, global interceptor, and global exception-handler decorators. Discovery uses the TypeScript compiler AST in both modes: it reads decorator syntax and aliases from TypeScript, and it can recognize emitted decorator calls in compiled JavaScript without matching names inside comments or strings.

A development manifest has this shape:

```json
{
  "version": "1.0.0",
  "decoratorFiles": [
    {
      "path": "src/application.ts",
      "mtime": 1788220800000,
      "size": 842
    },
    {
      "path": "src/users/user.controller.ts",
      "mtime": 1788220800000,
      "size": 1240
    }
  ],
  "totalScanned": 18,
  "generatedAt": "2026-09-01T00:00:00.000Z",
  "environment": "development"
}
```

The fields have specific roles:

| Field            | Meaning                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `version`        | Cache schema version used to reject incompatible manifests                  |
| `decoratorFiles` | Project-relative module paths plus file modification time and size metadata |
| `totalScanned`   | Number of source files considered when the manifest was generated           |
| `generatedAt`    | Time at which the scan completed                                            |
| `environment`    | Whether paths target development TypeScript or production JavaScript        |

ExpressX maintains two forms of the manifest:

| Runtime     | Location                           | Behavior                                                                                                                                                             |
| ----------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Development | `<sourceDir>/.expressx/cache.json` | Contains `.ts` paths. With the configuration above, this is `src/.expressx/cache.json`. `expressx dev` validates and updates it as decorated source files change.    |
| Production  | `<outDir>/.expressx/cache.json`    | Contains compiled `.js` paths. With the configuration above, this is `dist/.expressx/cache.json`. `expressx build` generates it, and production startup requires it. |

When Core runs in TypeScript mode, a missing, unreadable, or incompatible development manifest triggers a source scan and a new manifest is written. TypeScript mode is selected when `EXPRESSX_RUNTIME=ts` or `NODE_ENV=development`; the CLI sets the appropriate defaults for `expressx dev`. Production startup is intentionally strict and does not scan source files as a fallback.

To avoid rescanning the project on every development startup, an existing development manifest is treated as the known file list. The running CLI watches additions, changes, and deletions. If you add a decorated file while the CLI is stopped, delete `src/.expressx/cache.json` before the next start so ExpressX performs a fresh discovery scan.

Treat both files as generated artifacts:

- Do not edit `cache.json` by hand.
- Run `expressx dev` while developing so additions, moves, and deletions made during that session are reflected automatically.
- Run `npm run build` after changing decorated files.
- Deploy `dist/.expressx/cache.json` together with the compiled JavaScript in `dist`.
- Do not copy the development manifest into `dist`; its paths point to TypeScript source files.

## Create an application

Define the application lifecycle in `src/application.ts`. Register common middleware with the fluent helpers and arbitrary Express request handlers with `use()` during `onInit`:

```ts
import { Application, ExpressX, ExpressXApp, OnInitExpressXApp } from '@expressxjs/core';

@Application()
export class MyApplication extends ExpressX {
  public async preInit(): Promise<void> {
    // Connect databases and other infrastructure here.
  }

  public async onInit(app: OnInitExpressXApp): Promise<void> {
    app
      .useExpressJson({ limit: '1mb' })
      .useHelmet()
      .useUrlencoded({ extended: true })
      .useCors({ origin: 'https://example.com' })
      .use((req, _res, next) => {
        console.log(req.method, req.originalUrl);
        next();
      });
  }

  public postInit(app: ExpressXApp): void {
    // Routes have been registered at this point.
    void app;
  }
}
```

All four helpers are chainable and accept an optional, strongly typed options object. `useExpressJson()` and `useUrlencoded()` wrap Express's built-in parsers; `useHelmet()` and `useCors()` use the Helmet and CORS middleware bundled with Core. Use `use()` for any other standard Express request handler.

Bootstrap the HTTP server in `src/index.ts`:

```ts
import { ExpressXFactory } from '@expressxjs/core';
import { createServer } from 'node:http';
import { MyApplication } from './application';

async function bootstrap(): Promise<void> {
  const app = await ExpressXFactory.createApp<MyApplication>();
  const server = createServer(app);

  server.listen(3000, () => {
    console.log('API running at http://localhost:3000');
  });
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

## Controllers and responses

Controllers combine a base path with method-level route decorators. Use `@Body()` and `@Ctx()` to access request data and `HttpResponse` to control the status and response body:

```ts
import { Body, Controller, Ctx, GET, HttpContext, HttpResponse, POST } from '@expressxjs/core';
import { randomUUID } from 'node:crypto';

interface CreateUserDto {
  name: string;
}

@Controller('/users')
export class UserController {
  @GET('/')
  public findAll(): HttpResponse<Array<{ id: string; name: string }>> {
    return HttpResponse.ok([{ id: '1', name: 'Ada' }]);
  }

  @POST('/')
  public create(
    @Body() body: CreateUserDto,
    @Ctx() ctx: HttpContext,
  ): HttpResponse<{ id: string; name: string }> {
    console.log('User agent:', ctx.req.headers['user-agent']);
    return HttpResponse.created({
      id: randomUUID(),
      name: body.name,
    });
  }
}
```

Available route decorators are `@GET()`, `@POST()`, `@PUT()`, `@PATCH()`, and `@DELETE()`.

Controller handlers support these response styles:

```ts
import { Controller, Ctx, GET, HttpContext, HttpResponse, StatusCode } from '@expressxjs/core';

@Controller('/response-examples')
export class ResponseExamplesController {
  private readonly userList = [{ id: '1', name: 'Ada' }];

  // 1. Framework response: explicit status and body.
  @GET('/framework')
  public frameworkResponse() {
    return HttpResponse.ok(this.userList);
    // Equivalent builder form:
    // return new HttpResponse().status(200).body(this.userList);
  }

  // 2. Plain JSON-compatible value: @StatusCode wins, or status 200 by default.
  @GET('/plain')
  @StatusCode(200)
  public plainResponse() {
    return { message: 'Users retrieved successfully', data: this.userList };
  }

  // 3. Direct Express response through @Ctx(): automatic serialization is skipped.
  @GET('/direct')
  public directResponse(@Ctx() ctx: HttpContext): void {
    ctx.res.status(200).json({
      message: 'Users retrieved successfully',
      data: this.userList,
    });
  }
}
```

An expected failure may be returned as `new HttpErrorResponse(statusCode, error)` without throwing. A returned `HttpResponse` or `HttpErrorResponse` supplies its own status and takes precedence over `@StatusCode`. For a direct Express response, `headersSent` prevents ExpressX from serializing a second response; do not also return another response body from that code path.

## Dependency injection

Mark services as injectable and request them through constructor injection:

```ts
import { Controller, GET, HttpResponse, Inject, Injectable } from '@expressxjs/core';

@Injectable()
export class UserService {
  public findAll(): string[] {
    return ['Ada', 'Grace'];
  }
}

@Controller('/users')
export class UserController {
  public constructor(
    @Inject(UserService)
    private readonly users: UserService,
  ) {}

  @GET('/')
  public findAll(): HttpResponse<string[]> {
    return HttpResponse.ok(this.users.findAll());
  }
}
```

Core also exports `@Singleton()`, `@Scoped()`, `@AutoInjectable()`, `@InjectAll()`, and registry helpers for more advanced container configuration.

## Guards, middleware, and interceptors

Route pipelines are declared next to a controller method:

```ts
import {
  Controller,
  ExpressXInterceptor,
  ExpressXMiddleware,
  GET,
  Guard,
  Handler,
  HttpContext,
  HttpResponse,
  NextFn,
  Request,
  UseGuards,
  UseInterceptors,
  UseMiddlewares,
} from '@expressxjs/core';

class ApiKeyGuard extends Guard {
  public canActivate(req: Request): boolean {
    return req.headers['x-api-key'] === process.env.API_KEY;
  }
}

class RequestLogger extends ExpressXMiddleware {
  public use(ctx: HttpContext, next: NextFn): void {
    console.log(ctx.req.method, ctx.req.originalUrl);
    next();
  }
}

class TimingInterceptor extends ExpressXInterceptor {
  public async intercept(ctx: HttpContext, next: Handler): Promise<unknown> {
    const startedAt = Date.now();
    const result = await next.handle();
    ctx.res.setHeader('x-response-time', `${Date.now() - startedAt}ms`);
    return result;
  }
}

@Controller('/health')
export class HealthController {
  @GET('/')
  @UseGuards(ApiKeyGuard)
  @UseMiddlewares(RequestLogger)
  @UseInterceptors(TimingInterceptor)
  public check(): HttpResponse<{ status: string }> {
    return HttpResponse.ok({ status: 'ok' });
  }
}
```

Every route middleware must call `next()` to continue to the next guard, middleware, route interceptor, or controller. Omitting `next()` stops the remaining route pipeline and skips automatic response serialization, so the middleware should send a response itself when it short-circuits. The callback uses the exported Express `NextFn` type: call `next()` without returning it, or call `next(error)` to delegate to the mounted Express error pipeline. Thrown errors continue through ExpressX's interceptor and application exception-handler flow.

Pipeline components can also receive an optional numeric priority after the class, for example `@UseGuards(ApiKeyGuard, 10)`. Priorities do not reorder the pipeline stages. Guards and middleware share one ascending-priority list and can be ordered against their own type or each other. Route-interceptor priorities are scoped only to route interceptors. Classes listed in the same decorator call keep their written order when they share a priority.

```text
Global interceptors: before
  Guards + middleware (sorted together by ascending priority)
    Route interceptors: before (sorted among themselves by ascending priority)
      Controller
    Route interceptors: after (reverse order)
Global interceptors: after
```

A route interceptor therefore always wraps the controller after guards and middleware have passed. Its numeric priority cannot move it before either stage.

## Global interceptors

Use `@UseGlobalInterceptor()` when an interceptor should run for every route. For example, this interceptor wraps successful `HttpResponse` values in a consistent response envelope:

```ts
import {
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
```

Because this file contains `@UseGlobalInterceptor()`, the discovery manifest includes it and ExpressX registers it automatically. Global interceptors run in addition to route-level interceptors declared with `@UseInterceptors()`.

## Global exception handling

Create one global exception handler to translate thrown values into consistent HTTP responses:

```ts
import { ExceptionHandler, HttpErrorResponse, UseGlobalExceptionHandler } from '@expressxjs/core';

@UseGlobalExceptionHandler()
export class AppExceptionHandler extends ExceptionHandler {
  public catch(error: unknown): HttpErrorResponse {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const statusCode = message.startsWith('Unauthorized') ? 401 : 500;

    return new HttpErrorResponse(statusCode, {
      message,
      statusCode,
    });
  }
}
```

Because this file contains `@UseGlobalExceptionHandler()`, the scanner discovers and registers it automatically.

An exception handler must return an `HttpErrorResponse`, either directly or through a promise. This keeps the error
status and response body explicit while supporting both synchronous and asynchronous handlers.

## Run and build

```bash
# TypeScript runtime with file watching
npm run dev

# Generate the scanner cache and compile TypeScript
npm run build

# Run the compiled application
npm start
```

With the recommended build script, `expressx build` first creates the development manifest and maps its TypeScript paths into `dist/.expressx/cache.json`; `tsc` then compiles the corresponding JavaScript files. The entire `dist` directory, including its `.expressx` subdirectory, is the production artifact.

## Public entry points

The complete public API is available from `@expressxjs/core`. Focused subpath exports are also available:

```ts
import { Controller, GET } from '@expressxjs/core/decorators';
import { HttpResponse } from '@expressxjs/core/http';
import { ExpressXFactory } from '@expressxjs/core/framework';
```

Other subpaths include `/base`, `/common`, `/runtime`, `/scanner`, `/di-container`, and `/errors`. The legacy `/dicontainer` and singular `/error` aliases remain available for compatibility.

## License

MIT
