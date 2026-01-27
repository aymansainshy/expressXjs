
import { Express, Router, NextFunction, Request, Response } from 'express';
import { container, inject, injectable } from "tsyringe";
import { RouteDefinition } from '../decorators/methods.decorator';
import { CONTROLLER_METADATA, ControllerRegistry } from '../decorators/controller.decorator';
import { runGuard } from '../base/guards/guards';
import { ParamType } from '../decorators/prams.decorator';
import { HttpResponseHandler } from '../http/response.handler';
import { ExpressXInterceptor } from '../base/interceptors/interceptors';
import { Ctx, GUARDS_METADATA, INTERCEPTOR_METADATA, MIDDLEWARES_METADATA, Options, PARAM_METADATA, ROUTES_METADATA, VALIDATOR_METADATA } from '../common';




@injectable()
export class AppRouter {
  public getRouter(options?: Options): Router {
    const appRouter = Router();

    ControllerRegistry.controllers.forEach(controller => {
      const instance: any = container.resolve(controller);
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


        (appRouter as any)[method](fullPath, async (req: Request, res: Response, next: NextFunction) => {
          const ctx: Ctx = { req, res };
          const { pipeline, interceptors } = pipelineData;

          try {
            // 0. Create Instance per request if needed (stateful controllers), Global interceptors.


            // 1. Run Pipeline (Guards, Validators, Middlewares)
            for (const step of pipeline) {
              const runner: any = new step.cls(); // Use DI!
              if (step.type === GUARDS_METADATA.toString()) {
                const allowed = await runGuard(runner, ctx);
                if (!allowed) throw new Error('Unauthorized');
              } else {
                await runner.use(ctx);
              }
            }

            // 2. Interceptor 'before'
            for (const interceptor of interceptors) {
              const instance = new interceptor.cls() as ExpressXInterceptor;
              await instance.before(ctx);
            }

            // 3. Controller Execution
            let result = await this.callController(handler, paramMeta, req, res, next);

            // 4. Interceptor 'after' (Reverse)
            for (const interceptor of [...interceptors].reverse()) {
              result = await interceptor.after(ctx, result);
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
                return instance.onError ? instance.onError(ctx, err) : Promise.resolve()
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

  private async callController(handler: Function, paramMeta: any[], req: Request, res: Response, next: NextFunction) {
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