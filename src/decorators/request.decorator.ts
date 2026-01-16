export const ROUTES_METADATA = Symbol('ROUTES_METADATA');

export interface RouteDefinition {
  path: string;
  method: string;
  handlerName: string;
}

type HttpMethods = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

const Route = (method: HttpMethods, path: string): MethodDecorator => {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {

    if (!Reflect.hasMetadata(ROUTES_METADATA, target.constructor)) {
      Reflect.defineMetadata(ROUTES_METADATA, [], target.constructor);
    }

    const routes = Reflect.getMetadata(ROUTES_METADATA, target.constructor) as RouteDefinition[];

    routes.push({
      method: method.toLowerCase(),
      path,
      handlerName: propertyKey as string,
    });

    Reflect.defineMetadata(ROUTES_METADATA, routes, target.constructor);
  };
};


export const POST = (path: string): MethodDecorator => Route('POST', path);
export const GET = (path: string): MethodDecorator => Route('GET', path);
export const PUT = (path: string): MethodDecorator => Route('PUT', path);
export const DELETE = (path: string): MethodDecorator => Route('DELETE', path);
export const PATCH = (path: string): MethodDecorator => Route('PATCH', path);
