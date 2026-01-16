"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppRouter = void 0;
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const request_decorator_1 = require("../decorators/request.decorator");
const controller_decorator_1 = require("../decorators/controller.decorator");
let AppRouter = class AppRouter {
    constructor() {
        this.prefix = '/api/v1';
    }
    getRouter() {
        const appRouter = (0, express_1.Router)();
        controller_decorator_1.ControllerRegistry.controllers.forEach(controller => {
            const instance = tsyringe_1.container.resolve(controller);
            const basePath = Reflect.getMetadata(controller_decorator_1.CONTROLLER_METADATA, controller);
            const routes = Reflect.getMetadata(request_decorator_1.ROUTES_METADATA, controller);
            routes.forEach(route => {
                const handler = instance[route.handlerName].bind(instance);
                const fullPath = basePath ? `${basePath}${route.path}` : route.path;
                const method = route.method;
                appRouter[method](fullPath, handler); // HttpReponseHandler.handler(handler, req, res, next)
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
    }
    ;
};
exports.AppRouter = AppRouter;
exports.AppRouter = AppRouter = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], AppRouter);
