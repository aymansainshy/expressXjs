
import "reflect-metadata";
import express, { Express, Request, Response } from 'express';
import { container, inject, injectable } from 'tsyringe';
import { AppRouter } from "@expressX/core/routing";
import { Scanner } from "@expressX/core/scanner";
import { createServer } from "http";

export interface Options {
  prefix?: string;
  version?: string;
  configSource?: Map<string, any> | NodeJS.ProcessEnv;
}

@injectable()
class Kernel {
  protected app!: Express;
  private initialized = false;

  constructor(
    @inject(Scanner) protected scanner: Scanner,
  ) { }

  public async start(options?: Options): Promise<Express> {
    if (this.initialized) return this.app;

    // 1. Scan for controllers, configs, etc.
    await this.scanner.scanAll(options?.configSource);

    // 2. Create Express App
    const app = express();
    this.app = app;

    this.initialized = true;
    return this.app;
  }
}


export abstract class ExpressX {
  /**
   * Framework-only app creation & wiring
   */
  protected async createApp(options?: Options): Promise<Express> {
    // 0. Start Kernel
    const kernel: Kernel = container.resolve<Kernel>(Kernel);
    const app: Express = await kernel.start(options);

    // 1. Pre-Init (Async tasks like DB)
    await this.preInit();

    // 4. Initialization (User middlewares)
    this.onInit(app);

    // 5. Routing
    const appRouter: AppRouter = container.resolve<AppRouter>(AppRouter);
    app.use(appRouter.getRouter(options));

    // 6. Handle 404s
    this.onNotFound(app);

    // 7. Global Error Handling
    // const globalErrorHandler = container.resolve<GlobalErrorHandler>(GlobalErrorHandler);
    app.use((err: any, req: any, res: any, next: any) => {
      // this.errorHandler.handleError(err, req, res, next);
    });

    // 8. Final hook
    this.postInit(app);


    return app;
  }

  /** Lifecycle Hooks */
  protected abstract preInit(): Promise<void>;
  protected abstract onInit(app: Express): void;

  /** Default 404 Implementation - Can be overridden */
  protected onNotFound(app: Express): void {
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        status: 404,
        message: `Route ${req.originalUrl} not found in ExpressX`,
        path: req.originalUrl
      });
    });
  }

  /** Default Post-Init Implementation */
  protected postInit(app: Express): void {
    const routes = app._router.stack
      .filter((r: any) => r.route)
      .map((r: any) => r.route.path);

    console.log(`[ExpressX] ✅ Setup complete. ${routes.length} routes registered.`);
  }

  public abstract bootstrap(port: number): Promise<void>;
}






export class Application extends ExpressX {
  protected preInit(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  protected onInit(app: Express): void {
    throw new Error("Method not implemented.");
  }
  public async bootstrap(port: number): Promise<void> {
    const app: Express = await this.createApp();
    const server = createServer(app);
    server.listen(port, () => {
      console.log(`[ExpressX] Server running on http://localhost:${port}`);
    });
  }
}