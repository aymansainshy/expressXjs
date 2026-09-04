import { MIDDLEWARES_METADATA } from '../common';
import { logger } from '../logger/logger';
import { parseArgs, pushManyWithPriority } from './utilities';

export function UseMiddlewares(...args: unknown[]): MethodDecorator {
  return (target: Object, key: string | symbol) => {
    const components = parseArgs(args, 3);
    logger.debug(
      `Applying @UseMiddlewares decorator to classes: ${components.map(({ cls }) => cls.name).join(', ')} ` +
        `in method "${key as string}" of class "${target.constructor.name}"`,
      'Decorator',
    );
    pushManyWithPriority(target, key, MIDDLEWARES_METADATA, components);
  };
}
