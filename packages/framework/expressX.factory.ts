

import { Kernel } from "../kernel";
import { ExpressXLogger } from "../logger/logger";
import { APP_TOKEN, Options } from "../common";
import { MissingApplicationDecoratorError, RouteNotFoundError } from "../errors/framework-errors";
import { ExpressX } from './expressX';
import { AppRouter } from '../routing';
import { ExpressXApp, Request, Response } from '../framework/types';
import { ExpressXContainer } from "../dicontainer";


const logger = new ExpressXLogger();
export abstract class ExpressXFactory {
  /**
  * Framework-only app creation & wiring
  */
  static async createApp<T extends ExpressX>(options?: Options): Promise<ExpressXApp> {
    // 0. Start Kernel
    const kernel: Kernel = ExpressXContainer.resolve<Kernel>(Kernel);
    const app: ExpressXApp = await kernel.start();

    // 2. SAFETY CHECK: Is the token registered?
    // tsyringe allows us to check if a token has a registration
    if (!ExpressXContainer.isRegistered(APP_TOKEN)) {
      throw new MissingApplicationDecoratorError();
    }

    // 3. Resolution: Get the class instance
    const expressXapplicaion = ExpressXContainer.resolve<ExpressX>(APP_TOKEN);

    // 4. Double Check Instance Type (Runtime Safety)
    if (!(expressXapplicaion instanceof ExpressX)) {
      logger.error("Resolved application does not inherit from ExpressX base class.")
      throw new Error("Resolved application does not inherit from ExpressX base class.");
    }

    // 5. Pre-Init (Async tasks like DB)
    await expressXapplicaion.preInit();

    // 6. Initialization (User middlewares)
    expressXapplicaion.onInit(app);

    // 7. Routing
    const appRouter: AppRouter = ExpressXContainer.resolve<AppRouter>(AppRouter);
    app.use(appRouter.getRouter(options));

    // 8. Handle 404s - Not Found
    app.use((req: Request, res: Response) => {
      throw new RouteNotFoundError(req.method, req.path);
    });

    // 9. Global Error Handling
    // const globalErrorHandler = ExpressXContainer.resolve<GlobalErrorHandler>(GlobalErrorHandler);
    app.use((err: any, req: any, res: any, next: any) => {
      // this.errorHandler.handleError(err, req, res, next);
    });

    // 10. Final hook
    expressXapplicaion.postInit(app);

    return app;
  }
}

