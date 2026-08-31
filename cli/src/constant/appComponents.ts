import { toKebabCase } from "../utils/toKebabCase";

// --- Generator Templates ---
export const templates = {
  controller: (name: string) => `import { Controller, Get } from '@expressxjs/core';

@Controller('/${toKebabCase(name.replace(/Controller$/, ''))}')
export class ${name} {
  @Get('/')
  async index() {
    return {
      message: 'Hello from ${name}!'
    };
  }
}
`,

  service: (name: string) => `import { Injectable } from '@expressxjs/core';

@Injectable()
export class ${name} {
  async findAll() {
    // Your business logic here
    return [];
  }

  async findOne(id: string) {
    // Your business logic here
    return { id };
  }

  async create(data: any) {
    // Your business logic here
    return data;
  }

  async update(id: string, data: any) {
    // Your business logic here
    return { id, ...data };
  }

  async delete(id: string) {
    // Your business logic here
    return { id };
  }
}
`,

  middleware: (name: string) => `import { Middleware, Request, Response, NextFunction } from '@expressxjs/core';

@Middleware()
export class ${name} {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
    next();
  }
}
`,

  interceptor: (name: string) => `import { Interceptor, Request, Response } from '@expressxjs/core';

@Interceptor()
export class ${name} {
  async intercept(req: Request, res: Response, next: Function) {
    console.log('Before request...');
    
    const result = await next();
    
    console.log('After request...');
    return result;
  }
}
`,

  application: (name: string) => `import { ExpressX, Application } from '@expressxjs/core';

@Application({
  port: 3000,
  // Add your configuration here
})
export class ${name} extends ExpressX {
  async onInit() {
    console.log('🚀 Application is starting...');
  }

  async onReady() {
    console.log('✅ Application is ready!');
  }
}
`
};
