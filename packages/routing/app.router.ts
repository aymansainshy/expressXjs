import { Router } from "express";
import {
  GUARDS_METADATA, INTERCEPTOR_METADATA,
  MIDDLEWARES_METADATA, PARAM_METADATA,
  ROUTES_METADATA, VALIDATOR_METADATA,
  CONTROLLER_METADATA,
  Options,
} from '../common';

import { runGuard } from '../base/guards/guards';
import { ExpressXInterceptor, runInterceptors } from '../base/interceptors/interceptors';
import { HttpResponseHandler } from '../http/response.handler';
import { NextFn, Request, Response } from "../framework";
import { ExpressXContainer } from "../dicontainer";
import { Singleton } from "../decorators/di";
import { ParamType, RouteDefinition } from "../decorators";
import { ControllerRegistry } from "./controllers.register";
import { GlobalInterceptorRegistry } from "../decorators/global-interceptors";
import { GLOBAL_EXCEPTION_HANDLER, STATUS_CODE_METADATA } from "../common/constants";
import { logger } from "../logger/logger";
import { ExceptionHandler } from "../base/exceptionHandler/exception-handler";
import { HttpErrorResponse } from "../http/http.error.response";





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

  public getRouter(options?: Options): Router {
    const appRouter = Router();
    let registeredRoutes = 0;

    logger.info(`Registering routes for ${ControllerRegistry.controllers.length} controller(s)...`, 'Router');

    ControllerRegistry.controllers.forEach(controller => {
      const instance: any = ExpressXContainer.resolve(controller);
      const basePath = Reflect.getMetadata(CONTROLLER_METADATA, controller);
      const routes = Reflect.getMetadata(ROUTES_METADATA, controller) as RouteDefinition[];

      if (!routes?.length) {
        logger.warn(`Controller "${controller.name}" has no routes - did you forget @GET/@POST/...?`, 'Router');
        return;
      }

      routes?.forEach(route => {
        const handler = instance[route.handlerName].bind(instance); // Function getUsers()
        const handerName: string = route.handlerName;       // hander name 'getUsers', 'createUser', etc.
        const method: string = route.method.toLowerCase(); // 'get', 'post', 'delete', 'put', patch'
        const routePath = route.path;                   // '/list-user', '/:id', etc.     
        const fullPath = basePath ? `${basePath}${routePath}` : routePath; // '/users/list-user', '//users/:id', etc.



        // Resolve Global interceptors
        const globalInterceptorClasses: ExpressXInterceptor[] = GlobalInterceptorRegistry.getAll();
        const globalInterceptors = globalInterceptorClasses.map((c: any) => ExpressXContainer.resolve<ExpressXInterceptor>(c));


        // This will prepare and sort the pipeline (guards, validators, middlewares and route-specific interceptors)
        // based on priority and type, so we don't have to do it per request
        const pipelineMetaData = this.preparePipelineData(instance, handerName);

        registeredRoutes++;
        logger.debug(
          `Mapped [${route.method.toUpperCase()}] ${fullPath} -> ${controller.name}.${handerName}() ` +
          `(guards/middlewares: ${pipelineMetaData.pipeline.length}, interceptors: ${pipelineMetaData.routeInterceptors.length + globalInterceptors.length})`,
          'Router'
        );

        (appRouter as any)[method](fullPath, async (req: Request, res: Response, next: NextFn) => {

          const { pipeline, routeInterceptors, paramMeta, statusCode } = pipelineMetaData;
          const requestStart = Date.now();

          logger.debug(`Incoming [${req.method}] ${req.originalUrl} -> ${controller.name}.${handerName}()`, 'Request');

          // Set once an error has been resolved into a response value, so the final
          // status still reflects the error even when an interceptor flattens the
          // HttpErrorResponse into a plain object.
          let errorStatus: number | undefined;

          // Hand the error to the global ExceptionHandler and return its result as a
          // *value* instead of rethrowing, so it travels back up the interceptor chain
          // and interceptors get to transform error responses like any other response.
          const resolveError = async (err: any): Promise<any> => {
            const exceptionHandler = this.getExceptionHandler();
            if (!exceptionHandler) {
              logger.debug('No global exception handler registered - delegating error to Express', 'ExceptionHandler');
              throw err; // No handler registered - let Express handle it
            }

            logger.error(
              `Error while handling [${req.method}] ${req.originalUrl} - delegating to "${exceptionHandler.constructor?.name}"`,
              'ExceptionHandler',
              err
            );

            const resolved = await exceptionHandler.catch(err);
            errorStatus = resolved instanceof HttpErrorResponse ? resolved.statusCode : 500;
            logger.debug(`Exception resolved to status ${errorStatus} - returning it through the interceptor chain`, 'ExceptionHandler');
            return resolved;
          };

          // 2. Run Pipeline (Guards, Validators, Middlewares)
          const corePipeline = async (): Promise<any> => {
            try {
              // a. route interceptors wrap controller
              for (const step of pipeline) {
                const runner: any = new step.cls(); // Use DI!
                if (step.type === GUARDS_METADATA.toString()) {
                  logger.debug(`Running guard "${runner.constructor.name}"`, 'Guard');
                  const allowed = await runGuard(runner, req);
                  const error = new Error(`Unauthorized: Guard ${runner.constructor.name} failed.`);
                  if (!allowed) {
                    logger.error(error.message, 'Guard', error);
                    throw error;
                  }
                  logger.debug(`Guard "${runner.constructor.name}" passed`, 'Guard');
                } else {
                  logger.debug(`Running middleware "${runner.constructor.name}"`, 'Middleware');
                  await runner.use({ req, res });
                }
              }

              // b. route interceptors wrap controller
              return await runInterceptors(
                { req, res },
                routeInterceptors.map((i: any) => new i.cls()),
                async () => {
                  try {
                    logger.debug(`Invoking handler ${controller.name}.${handerName}()`, 'Request');
                    return await this.callController(handler, paramMeta, req, res, next);
                  } catch (err) {
                    // Route interceptors see the error response too
                    return await resolveError(err);
                  }
                }
              );
            } catch (err) {
              // Guard / middleware / route-interceptor failures re-enter the global chain
              return await resolveError(err);
            }
          }

          try {

            // 1. Global interceptors wrap everything (including route-specific interceptors and controller)
            const result = await runInterceptors({ req, res }, globalInterceptors, corePipeline);

            logger.debug(
              `Completed [${req.method}] ${req.originalUrl} in ${Date.now() - requestStart}ms` +
              `${errorStatus ? ` (resolved error, status ${errorStatus})` : ''}`,
              'Request'
            );

            return HttpResponseHandler.handlerResponse(async () => result, res, next, errorStatus ?? statusCode);

          } catch (err) {
            logger.error(`Unresolved error for [${req.method}] ${req.originalUrl}`, 'Request', err as Error);
            if (res.headersSent) {
              logger.warn('Response headers already sent - delegating to Express error handler', 'Request');
              return next(err);
            }
            return HttpResponseHandler.handleError(err, next);
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
    // const validators = Reflect.getMetadata(VALIDATOR_METADATA, instance, handlerName) || [];
    const middlewares = Reflect.getMetadata(MIDDLEWARES_METADATA, instance, handlerName) || [];
    const routeInterceptors = Reflect.getMetadata(INTERCEPTOR_METADATA, instance, handlerName) || [];

    const statusCode: number | undefined = Reflect.getMetadata(STATUS_CODE_METADATA, instance, handlerName);

    const pipeline = [
      ...guards.map((g: any) => ({ ...g, type: GUARDS_METADATA.toString() })),
      // ...validators.map((v: any) => ({ ...v, type: VALIDATOR_METADATA.toString() })),
      ...middlewares.map((m: any) => ({ ...m, type: MIDDLEWARES_METADATA.toString() }))
    ].sort((a, b) => a.priority - b.priority);

    // Extract param metadata once during boot to avoid doing it per request.
    const paramMeta: any[] = Reflect.getMetadata(PARAM_METADATA, instance, handlerName) || [];

    return { pipeline, routeInterceptors, paramMeta, statusCode };
  }

  private async callController(handler: Function, paramMeta: any[], req: Request, res: Response, next: NextFn) {
    const args: any[] = new Array(paramMeta.length);

    for (const meta of paramMeta) {
      switch (meta.type) {
        case ParamType.PARAM: args[meta.index] = req.params[meta.key]; break;
        // case ParamType.REQ: args[meta.index] = req; break;
        // case ParamType.RES: args[meta.index] = res; break;
        case ParamType.CTX: args[meta.index] = { req, res }; break;
        case ParamType.BODY: args[meta.index] = req.body; break; // Validate body
        case ParamType.NEXT: args[meta.index] = next; break;
      }
    }
    return handler(...args);
  }
}