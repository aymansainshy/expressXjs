import { Express } from 'express';
import { Scanner } from '../scanner';
export declare class Kernel {
    protected scanner: Scanner;
    protected app: Express;
    private initialized;
    constructor(scanner: Scanner);
    start(): Promise<Express>;
}
//# sourceMappingURL=app.kernel.d.ts.map