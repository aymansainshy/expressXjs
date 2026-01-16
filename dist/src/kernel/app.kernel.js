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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressX = void 0;
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const tsyringe_1 = require("tsyringe");
const routing_1 = require("@expressX/core/routing");
const scanner_1 = require("@expressX/core/scanner");
let Kernel = class Kernel {
    constructor(appRouter, scanner) {
        this.appRouter = appRouter;
        this.scanner = scanner;
    }
};
Kernel = __decorate([
    __param(0, (0, tsyringe_1.inject)(routing_1.AppRouter)),
    __param(1, (0, tsyringe_1.inject)(scanner_1.Scanner)),
    __metadata("design:paramtypes", [routing_1.AppRouter,
        scanner_1.Scanner])
], Kernel);
class ExpressX extends Kernel {
    constructor() {
        super(...arguments);
        this.fullPrefix = '';
        this.initialized = false;
    }
    /**
     * Handles the prefixing logic based on user config
     */
    preConfig(config) {
        this.app;
        const prefix = config?.prefix ?? '/api';
        const version = config?.version ?? 'v1';
        // Combines to /api/v1 by default
        this.fullPrefix = `/${prefix}/${version}`.replace(/\/+/g, '/');
    }
    /**
     * Framework-only app creation & wiring
     */
    async createApp(config) {
        if (this.initialized)
            return this.app;
        // 1. Pre-Init (Async tasks like DB)
        await this.preInit();
        // 2. Pre-Config (Setup prefix/versioning)
        this.preConfig(config);
        const app = (0, express_1.default)();
        this.app = app;
        // 3. Discovery (Load controllers)
        await this.scanner.scanControllers();
        // 4. Initialization (User middlewares)
        this.onInit(app);
        // 5. Routing
        app.use(this.fullPrefix, this.appRouter.getRouter());
        // 6. Handle 404s
        this.onNotFound(app);
        // 7. Global Error Handling
        app.use((err, req, res, next) => {
            // this.errorHandler.handleError(err, req, res, next);
        });
        // 8. Final hook
        this.postInit(app);
        this.initialized = true;
        return app;
    }
    /** Default 404 Implementation - Can be overridden */
    onNotFound(app) {
        app.use((req, res) => {
            res.status(404).json({
                status: 404,
                message: `Route ${req.originalUrl} not found in ExpressX`,
                path: req.originalUrl
            });
        });
    }
    /** Default Post-Init Implementation */
    postInit(app) {
        const routes = app._router.stack
            .filter((r) => r.route)
            .map((r) => r.route.path);
        console.log(`[ExpressX] ✅ Setup complete. ${routes.length} routes registered.`);
    }
}
exports.ExpressX = ExpressX;
