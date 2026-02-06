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
import { STATUS_CODE_METADATA } from "../common/constants";





@Singleton()
export class AppRouter {
  public getRouter(options?: Options): Router {
    const appRouter = Router();

    ControllerRegistry.controllers.forEach(controller => {
      const instance: any = ExpressXContainer.resolve(controller);
      const basePath = Reflect.getMetadata(CONTROLLER_METADATA, controller);
      const routes = Reflect.getMetadata(ROUTES_METADATA, controller) as RouteDefinition[];

      routes?.forEach(route => {
        const handler = instance[route.handlerName].bind(instance); // Function getUsers()
        const handerName: string = route.handlerName;       // hander name 'getUsers', 'createUser', etc.
        const method: string = route.method.toLowerCase(); // 'get', 'post', 'delete', 'put', patch'
        const routePath = route.path;                   // '/list-user', '/:id', etc.     
        const fullPath = basePath ? `${basePath}${routePath}` : routePath; // '/users/list-user', '//users/:id', etc.



        // Resolve Global interceptors
        const globalInterceptorClasses: ExpressXInterceptor[] = GlobalInterceptorRegistry.getAll();
        const globalInterceptors = globalInterceptorClasses.map((c: any) => ExpressXContainer.resolve<ExpressXInterceptor>(c));

        console.log("Global Interceptors Resolved: ", globalInterceptors);

        // This will prepare and sort the pipeline (guards, validators, middlewares and route-specific interceptors)
        // based on priority and type, so we don't have to do it per request
        const pipelineMetaData = this.preparePipelineData(instance, handerName);

        (appRouter as any)[method](fullPath, async (req: Request, res: Response, next: NextFn) => {

          const { pipeline, routeInterceptors, paramMeta, statusCode } = pipelineMetaData;
          // ---- CORE pipeline (no response emission here)
          const corePipeline = async (): Promise<any> => {

            // 1. Run Pipeline (Guards, Validators, Middlewares)
            for (const step of pipeline) {
              const runner: any = new step.cls(); // Use DI!
              if (step.type === GUARDS_METADATA.toString()) {
                const allowed = await runGuard(runner, req);
                if (!allowed) throw new Error('Unauthorized');
              } else {
                await runner.use(req, res);
              }
            }

            // 2. route interceptors wrap controller
            return runInterceptors(
              { req, res },
              routeInterceptors.map((i: any) => new i.cls()),
              async () => await this.callController(handler, paramMeta, req, res, next)
            );

          }

          try {

            const result = await runInterceptors({ req, res }, globalInterceptors, corePipeline);

            return HttpResponseHandler.handlerResponse(async () => result, res, next, statusCode);

          } catch (err) {
            if (res.headersSent) return next(err);
            return HttpResponseHandler.handleError(err, next);
          }
        });
      });
    });

    return appRouter;
  }

  /**
   * Helper to pre-sort and resolve metadata during controller registration
   */
  private preparePipelineData(instance: any, handlerName: string) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, instance, handlerName) || [];
    // const validators = Reflect.getMetadata(VALIDATOR_METADATA, instance, handlerName) || [];
    const middlewares = Reflect.getMetadata(MIDDLEWARES_METADATA, instance, handlerName) || [];
    // Resolve interceptors once or keep classes to resolve per request if they have state
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
        case ParamType.REQ: args[meta.index] = req; break;
        case ParamType.RES: args[meta.index] = res; break;
        case ParamType.BODY: args[meta.index] = req.body; break; // Validate body
        case ParamType.NEXT: args[meta.index] = next; break;
      }
    }
    return handler(...args);
  }
}