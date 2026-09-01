# ExpressX Core

ExpressX Core is a lightweight, object-oriented framework built on Express. It adds decorator-based routing, dependency injection, lifecycle hooks, request pipelines, automatic source scanning, and structured HTTP responses while keeping the underlying Express application available.

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

## Create an application

Define the application lifecycle in `src/application.ts`. Register ordinary Express middleware during `onInit`:

```ts
import {
  Application,
  ExpressX,
  ExpressXApp,
  OnInitExpressXApp,
} from '@expressxjs/core';
import express from 'express';

@Application()
export class MyApplication extends ExpressX {
  public async preInit(): Promise<void> {
    // Connect databases and other infrastructure here.
  }

  public async onInit(app: OnInitExpressXApp): Promise<void> {
    app.use(express.json());
  }

  public postInit(app: ExpressXApp): void {
    // Routes have been registered at this point.
    void app;
  }
}
```

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
import {
  Body,
  Controller,
  Ctx,
  GET,
  HttpContext,
  HttpResponse,
  POST,
} from '@expressxjs/core';
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
    return HttpResponse.created({ id: randomUUID(), name: body.name });
  }
}
```

Available route decorators are `@GET()`, `@POST()`, `@PUT()`, `@PATCH()`, and `@DELETE()`.

## Dependency injection

Mark services as injectable and request them through constructor injection:

```ts
import {
  Controller,
  GET,
  HttpResponse,
  Inject,
  Injectable,
} from '@expressxjs/core';

@Injectable()
export class UserService {
  public findAll(): string[] {
    return ['Ada', 'Grace'];
  }
}

@Controller('/users')
export class UserController {
  public constructor(@Inject(UserService) private readonly users: UserService) {}

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
  public use(ctx: HttpContext): void {
    console.log(ctx.req.method, ctx.req.originalUrl);
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

Pipeline components can also receive an optional numeric priority after the class, for example `@UseGuards(ApiKeyGuard, 10)`.

## Global exception handling

Create one global exception handler to translate thrown values into consistent HTTP responses:

```ts
import {
  ExceptionHandler,
  HttpErrorResponse,
  UseGlobalExceptionHandler,
} from '@expressxjs/core';

@UseGlobalExceptionHandler()
export class AppExceptionHandler extends ExceptionHandler {
  public catch(error: unknown): HttpErrorResponse {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const statusCode = message.startsWith('Unauthorized') ? 401 : 500;

    return new HttpErrorResponse(statusCode, { message, statusCode });
  }
}
```

Because this file contains `@UseGlobalExceptionHandler()`, the scanner discovers and registers it automatically.

## Run and build

```bash
# TypeScript runtime with file watching
npm run dev

# Generate the scanner cache and compile TypeScript
npm run build

# Run the compiled application
npm start
```

## Public entry points

The complete public API is available from `@expressxjs/core`. Focused subpath exports are also available:

```ts
import { Controller, GET } from '@expressxjs/core/decorators';
import { HttpResponse } from '@expressxjs/core/http';
import { ExpressXFactory } from '@expressxjs/core/framework';
```

Other subpaths include `/base`, `/common`, `/runtime`, `/scanner`, `/dicontainer`, and `/errors`. The singular `/error` alias remains available for compatibility.

## License

MIT
