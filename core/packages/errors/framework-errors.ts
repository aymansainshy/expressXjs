// src/errors/framework-errors.ts
export class MissingApplicationDecoratorError extends Error {
  constructor() {
    super(
      'ExpressX application startup failed because no application class was registered.\n' +
        'Create a class that extends ExpressX, decorate it with @Application(), and ensure its file is inside the configured scan directory.\n\n' +
        'Example:\n' +
        '@Application()\n' +
        'export class MyApplication extends ExpressX { ... }',
    );
    this.name = 'MissingApplicationDecoratorError';
  }
}

export class RouteNotFoundError extends Error {
  public status: number;
  constructor(method: string, path: string) {
    super(`Route not found: [${method.toUpperCase()}] ${path}`);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}
