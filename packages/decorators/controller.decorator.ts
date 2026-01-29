import { CONTROLLER_METADATA } from '../common';
import { Singleton } from './di.container.decorator';




export class ControllerRegistry {
  public static readonly controllers: any[] = [];
  public static add(target: any) {
    if (!this.controllers.includes(target)) this.controllers.push(target);
  }
}

export function Controller(path: string = ''): ClassDecorator {
  return (target: any) => {
    Singleton()(target);
    Reflect.defineMetadata(CONTROLLER_METADATA, path, target);
    ControllerRegistry.add(target);
  };
}