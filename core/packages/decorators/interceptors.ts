import { INTERCEPTOR_METADATA } from '../common';
import { parseArgs, pushManyWithPriority } from './utilities';
import { logger } from '../logger/logger';

export function UseInterceptors(...args: unknown[]): MethodDecorator {
  return (target: Object, key: string | symbol) => {
    const components = parseArgs(args, 4);
    logger.debug(
      `Applying @UseInterceptors decorator to classes: ${components.map(({ cls }) => cls.name).join(', ')} ` +
        `in method "${key as string}" of class "${target.constructor.name}"`,
      'Decorator',
    );
    pushManyWithPriority(target, key, INTERCEPTOR_METADATA, components);
  };
}
