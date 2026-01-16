
import "reflect-metadata";
import express, { Application, Request, Response } from 'express';
import { inject } from 'tsyringe';
import { AppRouter } from "@expressX/core/routing";
import { Scanner } from "@expressX/core/scanner";

export interface Config {
  prefix?: string;
  version?: string;
}

class Kernel {
  constructor(
    @inject(AppRouter) protected appRouter: AppRouter,
    @inject(Scanner) protected scanner: Scanner
  ) { }
}


export abstract class ExpressX extends Kernel {

  protected app!: Application;
  private fullPrefix: string = '';
  private initialized = false;

  /**
   * Handles the prefixing logic based on user config
   */
  protected preConfig(config?: Config): void {
    this.app
    const prefix = config?.prefix ?? '/api';
    const version = config?.version ?? 'v1';
    // Combines to /api/v1 by default
    this.fullPrefix = `/${prefix}/${version}`.replace(/\/+/g, '/');
  }

  /**
   * Framework-only app creation & wiring
   */
  protected async createApp(config?: Config): Promise<Application> {
    if (this.initialized) return this.app;

    // 1. Pre-Init (Async tasks like DB)
    await this.preInit();

    // 2. Pre-Config (Setup prefix/versioning)
    this.preConfig(config);

    const app = express();
    this.app = app;

    // 3. Discovery (Load controllers)
    await this.scanner.scanControllers();

    // 4. Initialization (User middlewares)
    this.onInit(app);

    // 5. Routing
    app.use(this.fullPrefix, this.appRouter.getRouter());

    // 6. Handle 404s
    this.onNotFound(app);

    // 7. Global Error Handling
    app.use((err: any, req: any, res: any, next: any) => {
      // this.errorHandler.handleError(err, req, res, next);
    });

    // 8. Final hook
    this.postInit(app);

    this.initialized = true;
    return app;
  }

  /** Lifecycle Hooks */
  protected abstract preInit(): Promise<void>;
  protected abstract onInit(app: Application): void;

  /** Default 404 Implementation - Can be overridden */
  protected onNotFound(app: Application): void {
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        status: 404,
        message: `Route ${req.originalUrl} not found in ExpressX`,
        path: req.originalUrl
      });
    });
  }

  /** Default Post-Init Implementation */
  protected postInit(app: Application): void {
    const routes = app._router.stack
      .filter((r: any) => r.route)
      .map((r: any) => r.route.path);

    console.log(`[ExpressX] ✅ Setup complete. ${routes.length} routes registered.`);
  }

  public abstract bootstrap(port: number): Promise<void>;
}