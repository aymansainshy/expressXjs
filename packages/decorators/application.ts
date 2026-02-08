
import { ExpressX } from '../framework';
import { APP_OPTIONS, APP_TOKEN, Options } from '../common';
import { ExpressXContainer } from '../dicontainer';
import { ExpressXLogger } from '../logger';

const logger = new ExpressXLogger();

// This type ensures the class has a constructor and results in an ExpressX instance
export type ExpressXConstructor = new (...args: any[]) => ExpressX;

export function Application(options: Options = {}): ClassDecorator {
  // We constrain the 'target' to be a constructor of ExpressX
  return (target: any) => {
    logger.debug(`Applying @Application decorator to class "${target.name}" with options: ${JSON.stringify(options)}`, 'Decorator');
    const constructor = target as unknown as ExpressXConstructor;

    // Validation check: ensure it has the required lifecycle methods
    // (Though the type constraint below usually handles this at compile-time)
    if (!(target.prototype instanceof ExpressX)) {
      throw new Error(
        `@Application decorator can only be applied to classes extending ExpressX. ` +
        `Class "${target.name}" does not extend ExpressX.`
      );
    }

    // Check if the class already registers itself as an application (to prevent multiple @Application decorators)
    if (ExpressXContainer.isRegistered(APP_TOKEN)) {
      const error = new Error(
        `Multiple @Application decorators detected. Only one class can be decorated with @Application. ` +
        `Class "${target.name}" cannot be registered as an application because another class is already registered.`
      );
      logger.error(error.message);
      throw error;
    }

    // 1. Store Metadata
    Reflect.defineMetadata(APP_OPTIONS, options, target);


    // 2. Register the class itself as singleton (what users expect)
    ExpressXContainer.registerSingleton(constructor as any);

    // 3. Register APP_TOKEN to point to the same singleton instance
    ExpressXContainer.register(APP_TOKEN, {
      useFactory: (c) => c.resolve(constructor as any)
    });
  };
}