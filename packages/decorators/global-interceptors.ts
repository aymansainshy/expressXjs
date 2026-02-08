import { ExpressXInterceptor } from "../base/interceptors/interceptors";
import { ExpressXLogger } from "../logger";
import { ExpressXContainer, Singleton } from "./di";

const logger = new ExpressXLogger();

export function UseGlobalInterceptor(): ClassDecorator {
  return (target: any) => {
    logger.debug(`Applying @UseGlobalInterceptor decorator to class "${target.name}"`, 'Decorator');
    const constructor = target as unknown as ExpressXInterceptor;

    if (!(target.prototype instanceof ExpressXInterceptor)) {
      throw new Error(
        `@UseGlobalInterceptor decorator can only be applied to classes extending ExpressXInterceptor. ` +
        `Class "${target.name}" does not extend ExpressXInterceptor.`
      );
    }
    ExpressXContainer.registerSingleton(constructor as any);
    GlobalInterceptorRegistry.register(target);
  };
}


export class GlobalInterceptorRegistry {
  private static readonly classes: any[] = [];

  static register(cls: any) {
    if (!this.classes.includes(cls)) this.classes.push(cls);
  }

  static getAll() {
    return [...this.classes];
  }
}