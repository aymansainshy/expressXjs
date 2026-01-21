"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppRouter = void 0;
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const controller_decorator_1 = require("../decorators/controller.decorator");
const guards_1 = require("../base/guards/guards");
const prams_decorator_1 = require("../decorators/prams.decorator");
const http_1 = require("../http");
const common_1 = require("../common");
let AppRouter = class AppRouter {
    getRouter(options) {
        const appRouter = (0, express_1.Router)();
        controller_decorator_1.ControllerRegistry.controllers.forEach(controller => {
            const instance = tsyringe_1.container.resolve(controller);
            const basePath = Reflect.getMetadata(controller_decorator_1.CONTROLLER_METADATA, controller);
            const routes = Reflect.getMetadata(common_1.ROUTES_METADATA, controller);
            routes.forEach(route => {
                const handler = instance[route.handlerName].bind(instance);
                const fullPath = basePath ? `${basePath}${route.path}` : route.path;
                const method = route.method.toLowerCase();
                // OPTIMIZATION: Extract metadata ONCE during boot
                const pipelineData = this.preparePipelineData(instance, handler);
                const paramMeta = Reflect.getMetadata(common_1.PARAM_METADATA, instance, handler) || [];
                appRouter[method](fullPath, async (req, res, next) => {
                    const ctx = { req, res };
                    const { pipeline, interceptors } = pipelineData;
                    try {
                        // 0. Create Instance per request if needed (stateful controllers), Global interceptors.
                        // 1. Run Pipeline (Guards, Validators, Middlewares)
                        for (const step of pipeline) {
                            const runner = new step.cls(); // Use DI!
                            if (step.type === common_1.GUARDS_METADATA.toString()) {
                                const allowed = await (0, guards_1.runGuard)(runner, ctx);
                                if (!allowed)
                                    throw new Error('Unauthorized');
                            }
                            else if (step.type === common_1.VALIDATOR_METADATA.toString()) {
                                await runner.validate(ctx);
                            }
                            else {
                                await runner.use(ctx);
                            }
                        }
                        // 2. Interceptor 'before'
                        for (const interceptor of interceptors) {
                            await interceptor.before(ctx);
                        }
                        // 3. Controller Execution
                        let result = await this.callController(instance, handler, paramMeta, req, res, next);
                        // 4. Interceptor 'after' (Reverse)
                        for (const interceptor of [...interceptors].reverse()) {
                            result = await interceptor.after(ctx, result);
                        }
                        return http_1.HttpResponseHandler.handlerResponse(async () => result, res, next);
                    }
                    catch (err) {
                        // 5. Interceptor 'onError'
                        // for (const interceptor of interceptors) {
                        //   await interceptor.onError(ctx, err);
                        // }
                        // Run all error hooks in parallel because they are independent side-effects
                        await Promise.all(interceptors.map(interceptor => interceptor.onError ? interceptor.onError(ctx, err) : Promise.resolve()));
                        return http_1.HttpResponseHandler.handleError(err, next); // Pass 'res' here
                    }
                });
            });
        });
        return appRouter;
    }
    /**
     * Helper to pre-sort and resolve metadata during controller registration
     */
    preparePipelineData(instance, handlerName) {
        const guards = Reflect.getMetadata(common_1.GUARDS_METADATA, instance, handlerName) || [];
        const validators = Reflect.getMetadata(common_1.VALIDATOR_METADATA, instance, handlerName) || [];
        const middlewares = Reflect.getMetadata(common_1.MIDDLEWARES_METADATA, instance, handlerName) || [];
        // Resolve interceptors once or keep classes to resolve per request if they have state
        const interceptorClasses = Reflect.getMetadata(common_1.INTERCEPTOR_METADATA, instance, handlerName) || [];
        const interceptors = interceptorClasses.map((m) => tsyringe_1.container.resolve(m.cls));
        const pipeline = [
            ...guards.map((g) => ({ ...g, type: common_1.GUARDS_METADATA.toString() })),
            ...validators.map((v) => ({ ...v, type: common_1.VALIDATOR_METADATA.toString() })),
            ...middlewares.map((m) => ({ ...m, type: common_1.MIDDLEWARES_METADATA.toString() }))
        ].sort((a, b) => a.priority - b.priority);
        return { pipeline, interceptors };
    }
    async callController(instance, handlerName, paramMeta, req, res, next) {
        const args = new Array(paramMeta.length);
        for (const meta of paramMeta) {
            switch (meta.type) {
                case prams_decorator_1.ParamType.PARAM:
                    args[meta.index] = req.params[meta.key];
                    break;
                case prams_decorator_1.ParamType.REQ:
                    args[meta.index] = req;
                    break;
                case prams_decorator_1.ParamType.RES:
                    args[meta.index] = res;
                    break;
                case prams_decorator_1.ParamType.BODY:
                    args[meta.index] = req.body;
                    break; // Validate body
                case prams_decorator_1.ParamType.NEXT:
                    args[meta.index] = next;
                    break;
            }
        }
        return instance[handlerName](...args);
    }
};
exports.AppRouter = AppRouter;
exports.AppRouter = AppRouter = __decorate([
    (0, tsyringe_1.injectable)()
], AppRouter);
