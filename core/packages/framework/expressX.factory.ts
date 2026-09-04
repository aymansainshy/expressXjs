import { Kernel } from '../kernel';
import { APP_TOKEN } from '../common';
import { MissingApplicationDecoratorError } from '../errors/framework-errors';
import { ExpressX } from './expressX';
import { AppRouter } from '../routing';
import { ExpressXApp, NextFn, Request, Response } from '../framework/types';
import { ExpressXContainer } from '../dicontainer';
import { logger } from '../logger/logger';
import { OnInitExpressXApp } from './on-init-setup';
import { lockExpressXApp } from './utils';
import { HttpErrorResponse } from '../http/http.error.response';

export function handleRouteNotFound(req: Request, res: Response): void {
  logger.warn(`No route matched [${req.method}] ${req.path}`, 'Router');

  const errorResponse = new HttpErrorResponse(404, {
    message: `Route not found: [${req.method.toUpperCase()}] ${req.path}`,
  });

  res.status(errorResponse.statusCode).json(errorResponse);
}

export function handleFrameworkError(err: any, req: Request, res: Response, next: NextFn): void {
  if (res.headersSent) {
    logger.warn('Response headers already sent - delegating error to Express', 'ErrorHandler');
    next(err);
    return;
  }

  logger.error(
    `Framework error handler reached for [${req.method}] ${req.path}: ${err?.message ?? 'Unhandled error'}`,
    'ErrorHandler',
    err,
  );

  const errorResponse =
    err instanceof HttpErrorResponse
      ? err
      : new HttpErrorResponse(err?.statusCode ?? err?.status ?? 500, {
          message: 'Internal Server Error',
        });

  res.status(errorResponse.statusCode).json(errorResponse);
}

export abstract class ExpressXFactory {
  /**
   * Framework-only app creation & wiring
   */
  static async createApp<T extends ExpressX>(): Promise<ExpressXApp> {
    const bootTime = Date.now();
    logger.info('Bootstrapping ExpressX application...', 'Bootstrap');

    // 0. Start Kernel
    const kernel: Kernel = ExpressXContainer.resolve<Kernel>(Kernel);
    const xApp: ExpressXApp = await kernel.start();

    // 2. SAFETY CHECK: Is the token registered?
    // tsyringe allows us to check if a token has a registration
    if (!ExpressXContainer.isRegistered(APP_TOKEN)) {
      const error = new MissingApplicationDecoratorError();
      logger.error(error.message, 'Bootstrap', error);
      throw error;
    }

    // 3. Resolution: Get the class instance
    const expressXApplication = ExpressXContainer.resolve<ExpressX>(APP_TOKEN);
    logger.debug(`Resolved application instance "${expressXApplication?.constructor?.name}"`, 'Bootstrap');

    // 4. Double Check Instance Type (Runtime Safety)
    if (!(expressXApplication instanceof ExpressX)) {
      const error = new Error('Resolved application does not inherit from ExpressX base class.');
      logger.error(error.message, 'Bootstrap', error);
      throw error;
    }

    // 5. Pre-Init (Async tasks like DB)
    logger.debug('Running preInit() hook...', 'Bootstrap');
    await expressXApplication.preInit();

    // 6. Initialization (User middlewares)
    logger.debug('Running onInit() hook...', 'Bootstrap');
    await expressXApplication.onInit(new OnInitExpressXApp(xApp));

    // 7. Routing
    logger.debug('Building application router...', 'Bootstrap');
    const appRouter: AppRouter = ExpressXContainer.resolve<AppRouter>(AppRouter);
    xApp.use(appRouter.getRouter());

    // 8. Handle 404s - Not Found
    xApp.use(handleRouteNotFound);

    // 9. Framework fallback for errors that reach the Express error pipeline.
    xApp.use(handleFrameworkError);

    // 10. Lock down the app instance to prevent further modifications
    // Object.freeze(xApp);
    lockExpressXApp(xApp);

    // 11. Final hook after everything is set up
    logger.debug('Running postInit() hook...', 'Bootstrap');
    expressXApplication.postInit(xApp);

    logger.success(`Application bootstrapped in ${Date.now() - bootTime}ms`, 'Bootstrap');
    return xApp;
  }
}
