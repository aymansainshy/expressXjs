import { MIDDLEWARES_METADATA } from '../common';
import { logger } from '../logger/logger';
import { parseArgs, pushWithPriority } from './utilities';

export function UseMiddlewares(...args: unknown[]): MethodDecorator {
  return (target: Object, key: string | symbol) => {
    const components = parseArgs(args, 3);
    logger.debug(
      `Applying @UseMiddlewares decorator to classes: ${components.map(({ cls }) => cls.name).join(', ')} ` +
        `in method "${key as string}" of class "${target.constructor.name}"`,
      'Decorator',
    );
    components.forEach((component) => pushWithPriority(target, key, MIDDLEWARES_METADATA, component));
  };
}
