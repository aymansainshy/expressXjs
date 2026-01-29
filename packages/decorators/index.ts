import "reflect-metadata"
export { ControllerRegistry, Controller } from './controller.decorator';
export * from './methods.decorator';
export * from './prams.decorator';
export * from './application.decorator';
export * from './middleware.decorator';
export * from './guard.decorator';
export * from './interceptor.decorator';
export * from './validatore.decorator';


// ✅ RELIABLE - Explicit named exports
export {
  Singleton,
  Injectable,
  Scoped,
  AutoInjectable,
  Registry,
  Inject,
  InjectAll,
  InjectWithTransform,
  createProvider,
} from './di.container.decorator';

