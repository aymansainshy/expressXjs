import { Router } from 'express';
import {
  GUARDS_METADATA,
  INTERCEPTOR_METADATA,
  MIDDLEWARES_METADATA,
  PARAM_METADATA,
  ROUTES_METADATA,
  CONTROLLER_METADATA,
} from '../common';

import { runGuard } from '../base/guards/guards';
import { ExpressXInterceptor, runInterceptors } from '../base/interceptors/interceptors';
import { HttpResponseHandler } from '../http/response.handler';
import { NextFn, Request, Response } from '../framework';
import { ExpressXContainer } from '../dicontainer';
import { Singleton } from '../decorators/di';
import { ParamType, RouteDefinition } from '../decorators';
import { ControllerRegistry } from './controllers.register';
import { ExpressXInterceptorConstructor, GlobalInterceptorRegistry } from '../decorators/global-interceptors';
import { GLOBAL_EXCEPTION_HANDLER, STATUS_CODE_METADATA } from '../common/constants';
import { logger } from '../logger/logger';
import { ExceptionHandler } from '../base/exceptionHandler/exception-handler';
import { HttpErrorResponse } from '../http/http.error.response';

@Singleton()
export class AppRouter {
  // undefined = not looked up yet, null = no handler registered
  private exceptionHandler?: ExceptionHandler | null;

  /**
   * Resolve the global exception handler lazily. Registration happens during
   * scanning, and apps are free not to declare one at all.
   * Error thrown by (throw new Error()) in route handlers will be caught here.
   */
  private getExceptionHandler(): ExceptionHandler | null {
    if (this.exceptionHandler === undefined) {
      this.exceptionHandler = ExpressXContainer.isRegistered(GLOBAL_EXCEPTION_HANDLER)
        ? ExpressXContainer.resolve<ExceptionHandler>(GLOBAL_EXCEPTION_HANDLER)
        : null;
    }
    return this.exceptionHandler;
  }

  public getRouter(): Router {
    const appRouter = Router();
    let registeredRoutes = 0;

    logger.info(`Registering routes for ${ControllerRegistry.controllers.length} controller(s)...`, 'Router');

    ControllerRegistry.controllers.forEach((controller) => {
      const instance: any = ExpressXContainer.resolve(controller);
      const basePath = Reflect.getMetadata(CONTROLLER_METADATA, controller);
      const routes = Reflect.getMetadata(ROUTES_METADATA, controller) as RouteDefinition[];

      if (!routes?.length) {
        logger.warn(`Controller "${controller.name}" has no routes - did you forget @GET/@POST/...?`, 'Router');
        return;
      }

      routes?.forEach((route) => {
        const handler = instance[route.handlerName].bind(instance); // Function getUsers()
        const handerName: string = route.handlerName; // hander name 'getUsers', 'createUser', etc.
        const method: string = route.method.toLowerCase(); // 'get', 'post', 'delete', 'put', patch'
        const routePath = route.path; // '/list-user', '/:id', etc.
        const fullPath = basePath ? `${basePath}${routePath}` : routePath; // '/users/list-user', '//users/:id', etc.

        // Resolve Global interceptors
        const globalInterceptorClasses: ExpressXInterceptorConstructor[] = GlobalInterceptorRegistry.getAll();
        const globalInterceptors = globalInterceptorClasses.map((interceptor) =>
          ExpressXContainer.resolve<ExpressXInterceptor>(interceptor),
        );

        // Prepare and sort guards, middleware, and route-specific interceptors.
        // based on priority and type, so we don't have to do it per request
        const pipelineMetaData = this.preparePipelineData(instance, handerName);

        registeredRoutes++;
        logger.debug(
          `Mapped [${route.method.toUpperCase()}] ${fullPath} -> ${controller.name}.${handerName}() ` +
            `(guards/middlewares: ${pipelineMetaData.pipeline.length}, interceptors: ${pipelineMetaData.routeInterceptors.length + globalInterceptors.length})`,
          'Router',
        );

        (appRouter as any)[method](fullPath, async (req: Request, res: Response, next: NextFn) => {
          const { pipeline, routeInterceptors, paramMeta, statusCode } = pipelineMetaData;
          let middlewareStopped = false;

          logger.debug(`Incoming [${req.method}] ${req.originalUrl} -> ${controller.name}.${handerName}()`, 'Request');

          // Resolve an error only after it has unwound through the interceptor chain.
          const resolveError = async (err: unknown): Promise<HttpErrorResponse> => {
            const exceptionHandler = this.getExceptionHandler();
            if (!exceptionHandler) {
              logger.debug('No global exception handler registered - delegating error to Express', 'ExceptionHandler');
              throw err;
            }

            logger.error(
              `Error while handling [${req.method}] ${req.originalUrl} - delegating to "${exceptionHandler.constructor?.name}"`,
              'ExceptionHandler',
              err instanceof Error || typeof err === 'string' ? err : undefined,
            );

            const resolved = await exceptionHandler.catch(err);
            if (!(resolved instanceof HttpErrorResponse)) {
              throw new TypeError('Global exception handler must return an HttpErrorResponse.');
            }

            return resolved;
          };

          // 2. Run guards and middleware.
          const corePipeline = async (): Promise<any> => {
            const runControllerPipeline = () =>
              runInterceptors(
                {
                  req,
                  res,
                },
                routeInterceptors.map((i: any) => ExpressXContainer.resolve<ExpressXInterceptor>(i.cls)),
                async () => {
                  logger.debug(`Invoking handler ${controller.name}.${handerName}()`, 'Request');
                  return this.callController(handler, paramMeta, req, res, next);
                },
              );

            // a. Guards continue automatically. Middleware must call next() to
            // dispatch the next priority-sorted step.
            const dispatch = async (index: number): Promise<any> => {
              if (index >= pipeline.length) return runControllerPipeline();

              const step = pipeline[index];
              const runner: any = ExpressXContainer.resolve<any>(step.cls);
              if (step.type === GUARDS_METADATA.toString()) {
                logger.debug(`Running guard "${runner.constructor.name}"`, 'Guard');
                const allowed = await runGuard(runner, req);
                const error = new Error(`Unauthorized: Guard ${runner.constructor.name} failed.`);
                if (!allowed) {
                  logger.error(error.message, 'Guard', error);
                  throw error;
                }
                logger.debug(`Guard "${runner.constructor.name}" passed`, 'Guard');
                return dispatch(index + 1);
              }

              logger.debug(`Running middleware "${runner.constructor.name}"`, 'Middleware');
              let nextCalled = false;
              let downstream: Promise<any> | undefined;
              const middlewareNext: NextFn = (error?: any) => {
                if (nextCalled) return;
                nextCalled = true;

                if (error) {
                  middlewareStopped = true;
                  next(error);
                  return;
                }

                downstream = dispatch(index + 1);
              };

              await runner.use(
                {
                  req,
                  res,
                },
                middlewareNext,
              );

              if (!nextCalled) {
                middlewareStopped = true;
                logger.debug(
                  `Middleware "${runner.constructor.name}" stopped the pipeline without calling next()`,
                  'Middleware',
                );
                return undefined;
              }

              return downstream;
            };

            return dispatch(0);
          };

          try {
            // 1. Global interceptors wrap everything (including route-specific interceptors and controller)
            const result = await runInterceptors(
              {
                req,
                res,
              },
              globalInterceptors,
              corePipeline,
            );

            if (middlewareStopped) return;
            return HttpResponseHandler.handlerResponse(async () => result, res, next, statusCode);
          } catch (err) {
            try {
              const errorResponse = await resolveError(err);
              return HttpResponseHandler.handlerResponse(async () => errorResponse, res, next);
            } catch (unresolvedError) {
              return HttpResponseHandler.delegateUnknownErrorToExpressXHandler(unresolvedError, next);
            }
          }
        });
      });
    });

    logger.success(`Router ready - ${registeredRoutes} route(s) registered`, 'Router');
    return appRouter;
  }

  /**
   * Helper to pre-sort and resolve metadata during controller registration
   */
  private preparePipelineData(instance: any, handlerName: string) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, instance, handlerName) || [];
    const middlewares = Reflect.getMetadata(MIDDLEWARES_METADATA, instance, handlerName) || [];
    const routeInterceptors = [...(Reflect.getMetadata(INTERCEPTOR_METADATA, instance, handlerName) || [])].sort(
      (first, second) => first.priority - second.priority,
    );

    const statusCode: number | undefined = Reflect.getMetadata(STATUS_CODE_METADATA, instance, handlerName);

    const pipeline = [
      ...guards.map((g: any) => ({
        ...g,
        type: GUARDS_METADATA.toString(),
      })),
      ...middlewares.map((m: any) => ({
        ...m,
        type: MIDDLEWARES_METADATA.toString(),
      })),
    ].sort((a, b) => a.priority - b.priority);

    // Extract param metadata once during boot to avoid doing it per request.
    const paramMeta: any[] = Reflect.getMetadata(PARAM_METADATA, instance, handlerName) || [];

    return {
      pipeline,
      routeInterceptors,
      paramMeta,
      statusCode,
    };
  }

  private async callController(handler: Function, paramMeta: any[], req: Request, res: Response, next: NextFn) {
    const args: any[] = new Array(paramMeta.length);

    for (const meta of paramMeta) {
      switch (meta.type) {
        case ParamType.PARAM:
          args[meta.index] = req.params[meta.key];
          break;
        // case ParamType.REQ: args[meta.index] = req; break;
        // case ParamType.RES: args[meta.index] = res; break;
        case ParamType.CTX:
          args[meta.index] = {
            req,
            res,
          };
          break;
        case ParamType.BODY:
          args[meta.index] = req.body;
          break; // Validate body
        case ParamType.NEXT:
          args[meta.index] = next;
          break;
      }
    }
    return handler(...args);
  }
}
