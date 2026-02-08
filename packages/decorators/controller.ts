import { CONTROLLER_METADATA } from '../common';
import { ExpressXLogger } from '../logger';
import { ControllerRegistry } from '../routing';
import { Singleton } from './di';

const logger = new ExpressXLogger();
export function Controller(path: string = ''): ClassDecorator {
  return (target: any) => {
    logger.debug(`Applying @Controller decorator to class "${target.name}" with path: ${path}`, 'Decorator');
    Singleton()(target);
    Reflect.defineMetadata(CONTROLLER_METADATA, path, target);
    ControllerRegistry.add(target);
  };
}