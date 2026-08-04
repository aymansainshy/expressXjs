

import { Kernel } from "../kernel";
import { APP_TOKEN, Options } from "../common";
import { MissingApplicationDecoratorError, RouteNotFoundError } from "../errors/framework-errors";
import { ExpressX } from './expressX';
import { AppRouter } from '../routing';
import { ExpressXApp, NextFn, Request, Response } from '../framework/types';
import { ExpressXContainer } from "../dicontainer";
import { logger } from "../logger/logger";
import { OnInitExpressXApp } from "./onIniteSetup";
import { lockExpressXApp } from "./utils";
import { ExceptionHandler } from "../errors";
import { GlobalExceptionResponseHandler } from "../http/global.exception.response.handler";
import { GLOBAL_EXCEPTION_HANDLER } from "../common/constants";

export abstract class ExpressXFactory {
  /**
  * Framework-only app creation & wiring
  */
  static async createApp<T extends ExpressX>(options?: Options): Promise<ExpressXApp> {
    // 0. Start Kernel
    const kernel: Kernel = ExpressXContainer.resolve<Kernel>(Kernel);
    const xApp: ExpressXApp = await kernel.start();

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
    await expressXapplicaion.onInit(new OnInitExpressXApp(xApp));

    // 7. Routing
    const appRouter: AppRouter = ExpressXContainer.resolve<AppRouter>(AppRouter);
    xApp.use(appRouter.getRouter(options));

    // 8. Handle 404s - Not Found
    xApp.use((req: Request, res: Response) => {
      throw new RouteNotFoundError(req.method, req.path);
    });

    // 9. Global Error Handling - fallback for anything the route pipeline did not
    // already resolve (404s, errors raised outside a route handler).
    const globalErrorHandler: ExceptionHandler | null = ExpressXContainer.isRegistered(GLOBAL_EXCEPTION_HANDLER)
      ? ExpressXContainer.resolve<ExceptionHandler>(GLOBAL_EXCEPTION_HANDLER)
      : null;
    xApp.use((err: any, req: Request, res: Response, next: NextFn) => {
      // If the error thrown using NextFn() in route handlers, it will be caught here.
      // If no global error handler is registered, log the error and return a generic 500 response.
      if (!globalErrorHandler) {
        logger.error(err?.message ?? "Unhandled error", 'ErrorHandler', err);
        res.status(500).json({ message: "Internal Server Error" });
        return;
      }
      GlobalExceptionResponseHandler.handleErrorResponse(globalErrorHandler, err, res).catch((error) => {
        logger.error("Error in global error handler", 'ErrorHandler', error);
        res.status(500).json({ message: "Internal Server Error" });
      });
    });

    // 10. Lock down the app instance to prevent further modifications
    // Object.freeze(xApp);
    lockExpressXApp(xApp);

    // 11. Final hook after everything is set up
    expressXapplicaion.postInit(xApp);

    return xApp;
  }
}

