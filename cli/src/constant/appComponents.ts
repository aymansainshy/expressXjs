import { toKebabCase } from '../utils/toKebabCase';
import { toPascalCase } from '../utils/toPascalCase';

export const componentTypes = [
  'controller',
  'service',
  'middleware',
  'interceptor',
  'guard',
  'exception',
  'dto',
  'application',
] as const;

export type ComponentType = typeof componentTypes[number];

export interface TemplateContext {
  baseName: string;
  className: string;
  fileName: string;
  routeName: string;
}

export interface ResourceTemplateOptions {
  withPipeline?: boolean;
}

const suffixes: Record<ComponentType, string> = {
  controller: 'Controller',
  service: 'Service',
  middleware: 'Middleware',
  interceptor: 'Interceptor',
  guard: 'Guard',
  exception: 'ExceptionHandler',
  dto: 'Dto',
  application: 'Application',
};

export const componentDirectories: Record<ComponentType, string> = {
  controller: 'controllers',
  service: 'services',
  middleware: 'middlewares',
  interceptor: 'interceptors',
  guard: 'guards',
  exception: 'exceptions',
  dto: 'dto',
  application: '',
};

export const typeAliases: Record<string, ComponentType | 'resource'> = {
  app: 'application',
  application: 'application',
  c: 'controller',
  controller: 'controller',
  dto: 'dto',
  e: 'exception',
  exception: 'exception',
  'exception-handler': 'exception',
  g: 'guard',
  guard: 'guard',
  i: 'interceptor',
  interceptor: 'interceptor',
  m: 'middleware',
  middleware: 'middleware',
  r: 'resource',
  resource: 'resource',
  s: 'service',
  service: 'service',
};

function pluralize(value: string): string {
  if (/(s|x|z|ch|sh)$/i.test(value)) return `${value}es`;
  if (/[^aeiou]y$/i.test(value)) return `${value.slice(0, -1)}ies`;
  return `${value}s`;
}

export function createTemplateContext(type: ComponentType, inputName: string): TemplateContext {
  const requestedName = toPascalCase(inputName.trim());
  const suffix = suffixes[type];
  const suffixPattern = new RegExp(`${suffix}$`, 'i');
  const baseName = requestedName.replace(suffixPattern, '') || requestedName;
  const fileName = toKebabCase(baseName);

  return {
    baseName,
    className: `${baseName}${suffix}`,
    fileName,
    routeName: pluralize(fileName),
  };
}

type ComponentTemplate = (context: TemplateContext) => string;

export const templates: Record<ComponentType, ComponentTemplate> = {
  controller: ({ className, routeName }) => `import { Controller, GET, HttpResponse } from '@expressxjs/core';

@Controller('/${routeName}')
export class ${className} {
  @GET('/')
  public async findAll(): Promise<HttpResponse<unknown[]>> {
    return HttpResponse.ok([]);
  }
}
`,

  service: ({ className }) => `import { Injectable } from '@expressxjs/core';

@Injectable()
export class ${className} {
  public async findAll(): Promise<unknown[]> {
    return [];
  }

  public async findOne(id: string): Promise<{ id: string }> {
    return { id };
  }
}
`,

  middleware: ({ className }) => `import {
  ExpressXLogger,
  ExpressXMiddleware,
  HttpContext,
} from '@expressxjs/core';

const logger = new ExpressXLogger();

export class ${className} extends ExpressXMiddleware {
  public use(ctx: HttpContext): void {
    logger.info(\`[\${ctx.req.method}] \${ctx.req.originalUrl}\`, '${className}');
  }
}
`,

  interceptor: ({ className }) => `import {
  ExpressXInterceptor,
  ExpressXLogger,
  Handler,
  HttpContext,
} from '@expressxjs/core';

const logger = new ExpressXLogger();

export class ${className} extends ExpressXInterceptor {
  public async intercept(ctx: HttpContext, callHandler: Handler): Promise<unknown> {
    const startedAt = Date.now();
    const result = await callHandler.handle();
    logger.debug(
      \`[\${ctx.req.method}] \${ctx.req.originalUrl} completed in \${Date.now() - startedAt}ms\`,
      '${className}',
    );
    return result;
  }
}
`,

  guard: ({ className }) => `import { Guard, Request } from '@expressxjs/core';

export class ${className} extends Guard {
  public canActivate(req: Request): boolean {
    return Boolean(req.headers.authorization);
  }
}
`,

  exception: ({ className }) => `import {
  ExceptionHandler,
  HttpErrorResponse,
  UseGlobalExceptionHandler,
} from '@expressxjs/core';

@UseGlobalExceptionHandler()
export class ${className} extends ExceptionHandler {
  public catch(error: unknown): HttpErrorResponse {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new HttpErrorResponse(500, { message });
  }
}
`,

  dto: ({ baseName }) => `export interface Create${baseName}Dto {
  name: string;
}

export interface Update${baseName}Dto {
  name?: string;
}
`,

  application: ({ className }) => `import {
  Application,
  ExpressX,
  ExpressXApp,
  OnInitExpressXApp,
} from '@expressxjs/core';

@Application()
export class ${className} extends ExpressX {
  public async preInit(): Promise<void> {
    // Connect databases and other infrastructure here.
  }

  public async onInit(app: OnInitExpressXApp): Promise<void> {
    // Register application-level middleware here.
    void app;
  }

  public postInit(app: ExpressXApp): void {
    // Run logic after routes are registered.
    void app;
  }
}
`,
};

export function createResourceTemplates(
  inputName: string,
  options: ResourceTemplateOptions = {},
): Record<string, string> {
  const context = createTemplateContext('controller', inputName);
  const { baseName, fileName, routeName } = context;
  const pipelineImports = options.withPipeline
    ? `import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RequestLoggerMiddleware } from '../../common/middlewares/request-logger.middleware';
import { TimingInterceptor } from '../../common/interceptors/timing.interceptor';
`
    : '';
  const pipelineDecorators = options.withPipeline
    ? `  @UseGuards(ApiKeyGuard)
  @UseMiddlewares(RequestLoggerMiddleware)
  @UseInterceptors(TimingInterceptor)
`
    : '';
  const pipelineSymbols = options.withPipeline
    ? ', UseGuards, UseInterceptors, UseMiddlewares'
    : '';

  return {
    [`${fileName}.dto.ts`]: `export interface Create${baseName}Dto {
  name: string;
}

export interface Update${baseName}Dto {
  name?: string;
}
`,
    [`${fileName}.service.ts`]: `import { Injectable } from '@expressxjs/core';
import { Create${baseName}Dto, Update${baseName}Dto } from './${fileName}.dto';

export interface ${baseName}Record {
  id: string;
  name: string;
  createdAt: string;
}

@Injectable()
export class ${baseName}Service {
  private readonly records: ${baseName}Record[] = [
    { id: '1', name: 'Example ${baseName}', createdAt: new Date().toISOString() },
  ];

  public findAll(): ${baseName}Record[] {
    return [...this.records];
  }

  public findOne(id: string): ${baseName}Record | undefined {
    return this.records.find((record) => record.id === id);
  }

  public create(input: Create${baseName}Dto): ${baseName}Record {
    const record: ${baseName}Record = {
      id: Date.now().toString(36),
      name: input.name,
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  public update(id: string, input: Update${baseName}Dto): ${baseName}Record | undefined {
    const record = this.findOne(id);
    if (!record) return undefined;
    Object.assign(record, input);
    return record;
  }

  public remove(id: string): boolean {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) return false;
    this.records.splice(index, 1);
    return true;
  }
}
`,
    [`${fileName}.controller.ts`]: `import {
  Body,
  Controller,
  Ctx,
  DELETE,
  GET,
  HttpContext,
  HttpErrorResponse,
  HttpResponse,
  Inject,
  POST,
  PUT${pipelineSymbols}
} from '@expressxjs/core';
${pipelineImports}import { Create${baseName}Dto, Update${baseName}Dto } from './${fileName}.dto';
import { ${baseName}Service } from './${fileName}.service';

@Controller('/${routeName}')
export class ${baseName}Controller {
  public constructor(
    @Inject(${baseName}Service) private readonly service: ${baseName}Service,
  ) {}

${pipelineDecorators}  @GET('/')
  public async findAll(): Promise<HttpResponse> {
    return HttpResponse.ok(this.service.findAll());
  }

  @GET('/:id')
  public async findOne(@Ctx() ctx: HttpContext): Promise<HttpResponse | HttpErrorResponse> {
    const record = this.service.findOne(ctx.req.params.id);
    return record
      ? HttpResponse.ok(record)
      : new HttpErrorResponse(404, { message: '${baseName} not found' });
  }

  @POST('/')
  public async create(@Body() input: Create${baseName}Dto): Promise<HttpResponse> {
    return HttpResponse.created(this.service.create(input));
  }

  @PUT('/:id')
  public async update(
    @Ctx() ctx: HttpContext,
    @Body() input: Update${baseName}Dto,
  ): Promise<HttpResponse | HttpErrorResponse> {
    const record = this.service.update(ctx.req.params.id, input);
    return record
      ? HttpResponse.ok(record)
      : new HttpErrorResponse(404, { message: '${baseName} not found' });
  }

  @DELETE('/:id')
  public async remove(@Ctx() ctx: HttpContext): Promise<HttpResponse | HttpErrorResponse> {
    return this.service.remove(ctx.req.params.id)
      ? HttpResponse.noContent()
      : new HttpErrorResponse(404, { message: '${baseName} not found' });
  }
}
`,
  };
}
