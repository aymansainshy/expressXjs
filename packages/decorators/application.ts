
import { ExpressX } from '../framework';
import { APP_OPTIONS, APP_TOKEN, Options } from '../common';
import { ExpressXContainer } from '../dicontainer';


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


    // 2. Register the class itself as singleton (what users expect)
    ExpressXContainer.registerSingleton(constructor as any);

    // 3. Register APP_TOKEN to point to the same singleton instance
    ExpressXContainer.register(APP_TOKEN, {
      useFactory: (c) => c.resolve(constructor as any)
    });
  };
}