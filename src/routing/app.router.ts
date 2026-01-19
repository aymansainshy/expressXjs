
import { Express, Router, NextFunction, Request, Response } from 'express';
import { container, inject, injectable } from "tsyringe";
import { RouteDefinition } from '../decorators/methods.decorator';
import { CONTROLLER_METADATA, ControllerRegistry } from '../decorators/controller.decorator';
import { runGuard } from '../base/guards/guards';
import { ParamType } from '../decorators/prams.decorator';
import { GUARDS_METADATA, INTERCEPTOR_METADATA, MIDDLEWARES_METADATA, PARAM_METADATA, ROUTES_METADATA, VALIDATOR_METADATA } from '@expressX/core/common';
import { HttpResponseHandler } from '../http';
import { Interceptor } from '../base/interceptors/interceptors';


@injectable()
export class AppRouter {
  private readonly prefix: string;

  constructor() {
    this.prefix = '/api/v1';
  }

  public getRouter(): Router {
    const appRouter = Router();
    ControllerRegistry.controllers.forEach(controller => {
      const instance: any = container.resolve(controller);

      const basePath = Reflect.getMetadata(CONTROLLER_METADATA, controller);
      const routes = Reflect.getMetadata(ROUTES_METADATA, controller) as RouteDefinition[];

      routes.forEach(route => {

        const handler = instance[route.handlerName].bind(instance);
        const fullPath: string = basePath ? `${basePath}${route.path}` : route.path;
        const method: string = route.method;

        const builtPipeline = this.buildPipeline(instance, handler);

        // (appRouter as any)[method](fullPath, handler);                 
        (appRouter as any)[method](fullPath, async (req: Request, res: Response, next: NextFunction) => {
          try {
            await builtPipeline(req, res, next);
          } catch (err) {
            next(err);
          }
        });


        /**
         * router.get('/auth/logout', handler)
         * router["post"]('/auth/login', handler)
         * router["post"]('/auth/login', handler)
         * router["get"]('/user', gerUserHandler)
         * ... etc
        */
      });

    });

    // app.get('/health', (req: Request, res: Response, next: NextFunction) => {
    //   res.status(200).send({
    //     status: 'healthy',
    //     timestamp: new Date(),
    //     uptime: process.uptime()
    //   });
    // });
    return appRouter;
  };

  protected buildPipeline(instance: any, handlerName: any) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, instance, handlerName) || [];
    const validators = Reflect.getMetadata(VALIDATOR_METADATA, instance, handlerName) || [];
    const middlewares = Reflect.getMetadata(MIDDLEWARES_METADATA, instance, handlerName) || [];
    const interceptors = Reflect.getMetadata(INTERCEPTOR_METADATA, instance, handlerName) || [];

    // Combine all into one array
    const pipeline: { type: string; cls: any; priority: number }[] = [
      ...guards.map((g: any) => ({ ...g, type: GUARDS_METADATA.toString() })),
      ...validators.map((v: any) => ({ ...v, type: VALIDATOR_METADATA.toString() })),
      ...middlewares.map((m: any) => ({ ...m, type: MIDDLEWARES_METADATA.toString() }))
    ];

    pipeline.sort((a, b) => a.priority - b.priority);

    return async (req: Request, res: Response, next: NextFunction) => {

      let i = -1;

      const runPipeline = async (): Promise<any> => {
        i++;
        if (i >= pipeline.length) runInterceptors();

        const step = pipeline[i];

        switch (step.type) {
          case GUARDS_METADATA.toString():
            const guard = new step.cls();
            const allowed = await runGuard(guard, { req, res });
            if (!allowed) return;
            return runPipeline();
          case VALIDATOR_METADATA.toString():
            await new step.cls().validate(req, res);
            return runPipeline();
          case MIDDLEWARES_METADATA.toString():
            return new step.cls().use(req, res, runPipeline);
        }
      };

      // Interceptors always wrap controller
      const runInterceptors = async () => {
        const ctx = { req, res };
        const instances: Interceptor[] = interceptors.map((i: any) => new i());

        // BEFORE
        for (const i of instances) {
          await i.before?.(ctx);
        }

        let result;
        try {
          result = await callController();   // 🔥 error propagates here
        } catch (err) {
          // ERROR hooks (reverse order)
          for (const i of [...instances].reverse()) {
            await i.onError?.(ctx, err);
          }
          throw err; // 🚀 rethrow for Express
        }

        // AFTER hooks
        for (const i of [...instances].reverse()) {
          if (i.after) {
            result = await i.after(ctx, result);
          }
        }

        return result;
      };


      // Helper to call controller with parameter decorators
      const paramMeta: any[] = Reflect.getMetadata(PARAM_METADATA, instance, handlerName) || [];

      const callController = async () => {
        const args: any[] = new Array(paramMeta.length).fill(undefined);
        for (const meta of paramMeta) {
          switch (meta.type) {
            case ParamType.PARAM:
              args[meta.index] = req.params[meta.key];
              break;
            case ParamType.REQ:
              args[meta.index] = req;
              break;
            case ParamType.RES:
              args[meta.index] = res;
              break;
            case ParamType.NEXT:
              args[meta.index] = next;
              break;
          }
        }
        return HttpResponseHandler.handler(
          async () => instance[handlerName](...args),
          res,
          next
        );
      };



      return runPipeline();
    };
  }

}



