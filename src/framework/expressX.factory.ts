import { ExpressX } from "./expressX";
import { Express, Request, Response } from 'express';
import { container } from 'tsyringe';
import { Kernel } from "../kernel";
import { AppRouter } from "../routing";
import { MissingApplicationDecoratorError, RouteNotFoundError } from "../errors/framework-errors";
import { APP_TOKEN, Options } from "../common";

export abstract class ExpressXFactory {
  /**
  * Framework-only app creation & wiring
  */
  static async createApp<T extends ExpressX>(options?: Options): Promise<Express> {
    // 0. Start Kernel
    const kernel: Kernel = container.resolve<Kernel>(Kernel);
    const app: Express = await kernel.start();

    // 2. SAFETY CHECK: Is the token registered?
    // tsyringe allows us to check if a token has a registration
    if (!container.isRegistered(APP_TOKEN)) {
      throw new MissingApplicationDecoratorError();
    }

    // 3. Resolution: Get the class instance
    const expressXapplicaion = container.resolve<ExpressX>(APP_TOKEN);

    // 4. Double Check Instance Type (Runtime Safety)
    if (!(expressXapplicaion instanceof ExpressX)) {
      throw new Error("[ExpressX] Resolved application does not inherit from ExpressX base class.");
    }

    // 5. Pre-Init (Async tasks like DB)
    await expressXapplicaion.preInit();
    // 6. Initialization (User middlewares)
    expressXapplicaion.onInit(app);

    // 7. Routing
    const appRouter: AppRouter = container.resolve<AppRouter>(AppRouter);
    app.use(appRouter.getRouter(options));

    // 8. Handle 404s - Not Found
    app.use((req: Request, res: Response) => {
      throw new RouteNotFoundError(req.method, req.path);
    });

    // 9. Global Error Handling
    // const globalErrorHandler = container.resolve<GlobalErrorHandler>(GlobalErrorHandler);
    app.use((err: any, req: any, res: any, next: any) => {
      // this.errorHandler.handleError(err, req, res, next);
    });

    // 10. Final hook
    expressXapplicaion.postInit(app);

    return app;
  }
}

