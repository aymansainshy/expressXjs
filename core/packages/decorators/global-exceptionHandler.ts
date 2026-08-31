import { GLOBAL_EXCEPTION_HANDLER } from "../common/constants";
import { ExceptionHandler } from "../errors";
import { logger } from "../logger/logger";
import { ExpressXContainer } from "./di";

export function UseGlobalExceptionHandler(): ClassDecorator {
  return (target: any) => {
    logger.debug(`Applying @UseGlobalExceptionHandler decorator to class "${target.name}"`, 'Decorator');
    const constructor = target as unknown as ExceptionHandler;

    if (!(target.prototype instanceof ExceptionHandler)) {
      throw new Error(
        `@UseGlobalExceptionHandler decorator can only be applied to classes extending ExceptionHandler. ` +
        `Class "${target.name}" does not extend ExceptionHandler.`
      );
    }
    ExpressXContainer.registerSingleton(constructor as any);

    // 3. Register GLOBAL_EXCEPTION_HANDLER to point to the same singleton instance
    ExpressXContainer.register(GLOBAL_EXCEPTION_HANDLER, {
      useFactory: (c) => c.resolve(constructor as any)
    });
  };
}