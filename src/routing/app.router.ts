
import { Express, Router, NextFunction, Request, Response } from 'express';
import { container, inject, injectable } from "tsyringe";
import { RouteDefinition, ROUTES_METADATA } from '../decorators/request.decorator';
import { CONTROLLER_METADATA, ControllerRegistry } from '../decorators/controller.decorator';


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

        (appRouter as any)[method](fullPath, handler);                             // HttpReponseHandler.handler(handler, req, res, next)
        // (appRouter as any)[method](fullPath, (req: Request, res: Response, next: NextFunction) => handler(req, res, next));


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

}