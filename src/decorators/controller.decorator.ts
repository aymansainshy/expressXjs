import { singleton } from 'tsyringe';

export const CONTROLLER_METADATA = Symbol('CONTROLLER_METADATA');

export class ControllerRegistry {
  public static readonly controllers: any[] = [];
  public static add(target: any) {
    if (!this.controllers.includes(target)) this.controllers.push(target);
  }
}

export function Controller(path: string = ''): ClassDecorator {
  return (target: any) => {
    singleton()(target);
    Reflect.defineMetadata(CONTROLLER_METADATA, path, target);
    ControllerRegistry.add(target);
  };
}