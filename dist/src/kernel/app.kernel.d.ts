import "reflect-metadata";
import { Application } from 'express';
import { AppRouter } from "@expressX/core/routing";
import { Scanner } from "@expressX/core/scanner";
export interface Config {
    prefix?: string;
    version?: string;
}
declare class Kernel {
    protected appRouter: AppRouter;
    protected scanner: Scanner;
    constructor(appRouter: AppRouter, scanner: Scanner);
}
export declare abstract class ExpressX extends Kernel {
    protected app: Application;
    private fullPrefix;
    private initialized;
    /**
     * Handles the prefixing logic based on user config
     */
    protected preConfig(config?: Config): void;
    /**
     * Framework-only app creation & wiring
     */
    protected createApp(config?: Config): Promise<Application>;
    /** Lifecycle Hooks */
    protected abstract preInit(): Promise<void>;
    protected abstract onInit(app: Application): void;
    /** Default 404 Implementation - Can be overridden */
    protected onNotFound(app: Application): void;
    /** Default Post-Init Implementation */
    protected postInit(app: Application): void;
    abstract bootstrap(port: number): Promise<void>;
}
export {};
//# sourceMappingURL=app.kernel.d.ts.map