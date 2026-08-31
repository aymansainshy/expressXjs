
import { GUARDS_METADATA } from "../common";
import { logger } from "../logger/logger";
import { parseArgs, pushWithPriority } from "./utilities";

export function UseGuards(...args: any[]) {
  return (target: Object, key: string | symbol) => {
    logger.debug(`Applying @UseGuards decorator to classs: ${args.map((a: any) => a.name).join(', ')} in method "${key as string}" of class "${target.constructor.name}"`, 'Decorator');
    return parseArgs(args, 1).forEach(({ cls, priority }) => pushWithPriority(target, key, GUARDS_METADATA, cls, priority));
  }
}