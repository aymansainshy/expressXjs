export declare const ROUTES_METADATA: unique symbol;
export interface RouteDefinition {
    path: string;
    method: string;
    handlerName: string;
}
export declare const POST: (path: string) => MethodDecorator;
export declare const GET: (path: string) => MethodDecorator;
export declare const PUT: (path: string) => MethodDecorator;
export declare const DELETE: (path: string) => MethodDecorator;
export declare const PATCH: (path: string) => MethodDecorator;
//# sourceMappingURL=request.decorator.d.ts.map