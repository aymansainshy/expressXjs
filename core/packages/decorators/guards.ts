import { GUARDS_METADATA } from '../common';
import { logger } from '../logger/logger';
import { parseArgs, pushWithPriority } from './utilities';

export function UseGuards(...args: unknown[]): MethodDecorator {
  return (target: Object, key: string | symbol) => {
    const components = parseArgs(args, 1);
    logger.debug(
      `Applying @UseGuards decorator to classes: ${components.map(({ cls }) => cls.name).join(', ')} ` +
        `in method "${key as string}" of class "${target.constructor.name}"`,
      'Decorator',
    );
    components.forEach((component) => pushWithPriority(target, key, GUARDS_METADATA, component));
  };
}
