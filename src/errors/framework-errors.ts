// src/errors/framework-errors.ts
export class MissingApplicationDecoratorError extends Error {
  constructor() {
    super(
      "\n[ExpressX] ❌ Startup Failed: No class found with @Application decorator.\n" +
      "Please ensure your main entry class extends 'ExpressX' and is decorated with '@Application()'.\n" +
      "Example:\n\n" +
      "@Application()\n" +
      "export class MyProject extends ExpressX { ... }\n"
    );
    this.name = "MissingApplicationDecoratorError";
  }
}



export class RouteNotFoundError extends Error {
  public status: number;
  constructor(method: string, path: string) {
    super(`Route not found: [${method.toUpperCase()}] ${path}`);
    this.name = "NotFoundError";
    this.status = 404;
  }
}