"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = exports.DELETE = exports.PUT = exports.GET = exports.POST = exports.ROUTES_METADATA = void 0;
exports.ROUTES_METADATA = Symbol('ROUTES_METADATA');
const Route = (method, path) => {
    return (target, propertyKey, descriptor) => {
        if (!Reflect.hasMetadata(exports.ROUTES_METADATA, target.constructor)) {
            Reflect.defineMetadata(exports.ROUTES_METADATA, [], target.constructor);
        }
        const routes = Reflect.getMetadata(exports.ROUTES_METADATA, target.constructor);
        routes.push({
            method: method.toLowerCase(),
            path,
            handlerName: propertyKey,
        });
        Reflect.defineMetadata(exports.ROUTES_METADATA, routes, target.constructor);
    };
};
const POST = (path) => Route('POST', path);
exports.POST = POST;
const GET = (path) => Route('GET', path);
exports.GET = GET;
const PUT = (path) => Route('PUT', path);
exports.PUT = PUT;
const DELETE = (path) => Route('DELETE', path);
exports.DELETE = DELETE;
const PATCH = (path) => Route('PATCH', path);
exports.PATCH = PATCH;
