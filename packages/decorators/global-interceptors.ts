import { ExpressXInterceptor } from "../base/interceptors/interceptors";
import { ExpressXContainer, Singleton } from "./di";


export function UseGlobalInterceptor(): ClassDecorator {
  return (target: any) => {
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