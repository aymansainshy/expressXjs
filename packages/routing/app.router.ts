import { Router } from "express";
import {
  GUARDS_METADATA, INTERCEPTOR_METADATA,
  MIDDLEWARES_METADATA, PARAM_METADATA,
  ROUTES_METADATA, VALIDATOR_METADATA,
  CONTROLLER_METADATA,
  Options,
} from '../common';

import { runGuard } from '../base/guards/guards';
import { ExpressXInterceptor } from '../base/interceptors/interceptors';
import { HttpResponseHandler } from '../http/response.handler';
import { NextFn, Request, Response } from "../framework";
import { ExpressXContainer } from "../dicontainer";
import { Singleton } from "../decorators/di.container.decorator";
import { ControllerRegistry, ParamType, RouteDefinition } from "../decorators";





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


        // OPTIMIZATION: Extract metadata ONCE during boot
        const pipelineData = this.preparePipelineData(instance, handerName);
        const paramMeta: any[] = Reflect.getMetadata(PARAM_METADATA, instance, handerName) || [];


        (appRouter as any)[method](fullPath, async (req: Request, res: Response, next: NextFn) => {

          const { pipeline, interceptors } = pipelineData;

          try {
            // 0. Create Instance per request if needed (stateful controllers), Global interceptors.


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

            // 2. Interceptor 'before'
            for (const interceptor of interceptors) {
              const instance = new interceptor.cls() as ExpressXInterceptor;
              await instance.before(req);
            }

            // 3. Controller Execution
            let result = await this.callController(handler, paramMeta, req, res, next);

            // 4. Interceptor 'after' (Reverse)
            for (const interceptor of [...interceptors].reverse()) {
              result = await interceptor.after(res, result);
            }


            return HttpResponseHandler.handlerResponse(async () => result, res, next);

          } catch (err) {
            // 5. Interceptor 'onError'
            // for (const interceptor of interceptors) {
            //   await interceptor.onError(ctx, err);
            // }
            // Run all error hooks in parallel because they are independent side-effects
            await Promise.all(
              interceptors.map((interceptor: any) => {
                const instance = new interceptor.cls() as ExpressXInterceptor;
                return instance.onError ? instance.onError(err) : Promise.resolve()
              })
            );
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
    const validators = Reflect.getMetadata(VALIDATOR_METADATA, instance, handlerName) || [];
    const middlewares = Reflect.getMetadata(MIDDLEWARES_METADATA, instance, handlerName) || [];

    // Resolve interceptors once or keep classes to resolve per request if they have state
    const interceptors = Reflect.getMetadata(INTERCEPTOR_METADATA, instance, handlerName) || [];
    // const interceptorsInstances: ExpressXInterceptor[] = interceptorClasses.map((m: any) => container.resolve<ExpressXInterceptor>(m.cls));

    const pipeline = [
      ...guards.map((g: any) => ({ ...g, type: GUARDS_METADATA.toString() })),
      ...validators.map((v: any) => ({ ...v, type: VALIDATOR_METADATA.toString() })),
      ...middlewares.map((m: any) => ({ ...m, type: MIDDLEWARES_METADATA.toString() }))
    ].sort((a, b) => a.priority - b.priority);

    return { pipeline, interceptors };
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