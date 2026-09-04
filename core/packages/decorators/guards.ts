import { GUARDS_METADATA } from '../common';
import { logger } from '../logger/logger';
import { parseArgs, pushManyWithPriority } from './utilities';

export function UseGuards(...args: unknown[]): MethodDecorator {
  return (target: Object, key: string | symbol) => {
    const components = parseArgs(args, 1);
    logger.debug(
      `Applying @UseGuards decorator to classes: ${components.map(({ cls }) => cls.name).join(', ')} ` +
        `in method "${key as string}" of class "${target.constructor.name}"`,
      'Decorator',
    );
    pushManyWithPriority(target, key, GUARDS_METADATA, components);
  };
}
