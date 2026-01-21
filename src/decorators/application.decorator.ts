// src/decorators/application.ts
import 'reflect-metadata';
import { singleton, container } from 'tsyringe';
import { ExpressX } from '../framework/expressX';
import { APP_OPTIONS, APP_TOKEN, Options } from '../common';





// This type ensures the class has a constructor and results in an ExpressX instance
export type ExpressXConstructor = new (...args: any[]) => ExpressX;

export function Application(options: Options = {}): ClassDecorator {
  // We constrain the 'target' to be a constructor of ExpressX
  return (target: any) => {
    const constructor = target as unknown as ExpressXConstructor;

    // Validation check: ensure it has the required lifecycle methods
    // (Though the type constraint below usually handles this at compile-time)
    if (!(target.prototype instanceof ExpressX)) {
      throw new Error(
        `@Application decorator can only be applied to classes extending ExpressX. ` +
        `Class "${target.name}" does not extend ExpressX.`
      );
    }

    // 1. Store Metadata
    Reflect.defineMetadata(APP_OPTIONS, options, target);

    // 2. DI Registration
    singleton()(target);
    container.register(APP_TOKEN, { useClass: constructor as any });
  };
}