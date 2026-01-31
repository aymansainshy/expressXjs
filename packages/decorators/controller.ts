import { CONTROLLER_METADATA } from '../common';
import { ControllerRegistry } from '../routing';
import { Singleton } from './di';

export function Controller(path: string = ''): ClassDecorator {
  return (target: any) => {
    Singleton()(target);
    Reflect.defineMetadata(CONTROLLER_METADATA, path, target);
    ControllerRegistry.add(target);
  };
}