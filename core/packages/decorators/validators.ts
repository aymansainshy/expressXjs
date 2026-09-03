import { VALIDATOR_METADATA } from '../common';
import { logger } from '../logger/logger';
import { parseArgs, pushWithPriority } from './utilities';

export function UseValidators(...args: any[]) {
  return (target: Object, key: string | symbol) => {
    logger.debug(
      `Applying @UseValidators decorator to classs: ${args.map((a: any) => a.name).join(', ')} in method "${key as string}" of class "${target.constructor.name}"`,
      'Decorator',
    );
    return parseArgs(args, 2).forEach(({ cls, priority }) =>
      pushWithPriority(target, key, VALIDATOR_METADATA, cls, priority),
    );
  };
}
