import { ExpressXInterceptor } from "../base/interceptors/interceptors";
import { logger } from "../logger/logger";
import { ExpressXContainer, Singleton } from "./di";

export function UseGlobalInterceptor(): ClassDecorator {
  return (target: any) => {
    logger.debug(`Applying @UseGlobalInterceptor decorator to class "${target.name}"`, 'Decorator');
    const constructor = target as unknown as ExpressXInterceptor;

    if (!(target.prototype instanceof ExpressXInterceptor)) {
      const error = new Error(
        `@UseGlobalInterceptor decorator can only be applied to classes extending ExpressXInterceptor. ` +
        `Class "${target.name}" does not extend ExpressXInterceptor.`
      );
      logger.error(error.message, 'Decorator', error);
      throw error;
    }
    ExpressXContainer.registerSingleton(constructor as any);
    GlobalInterceptorRegistry.register(target);
  };
}


export class GlobalInterceptorRegistry {
  private static readonly classes: any[] = [];

  static register(cls: any) {
    if (this.classes.includes(cls)) {
      logger.warn(`Global interceptor "${cls.name}" is already registered - ignoring duplicate`, 'Interceptor');
      return;
    }
    this.classes.push(cls);
    logger.debug(`Registered global interceptor "${cls.name}" (total: ${this.classes.length})`, 'Interceptor');
  }

  static getAll() {
    return [...this.classes];
  }
}