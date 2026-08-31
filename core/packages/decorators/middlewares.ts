import { MIDDLEWARES_METADATA } from "../common";
import { logger } from "../logger/logger";
import { parseArgs, pushWithPriority } from "./utilities";





export function UseMiddlewares(...args: any[]) {
  return (target: Object, key: string | symbol) => {
    logger.debug(`Applying @UseMiddlewares decorator to classs: ${args.map((a: any) => a.name).join(', ')} in method "${key as string}" of class "${target.constructor.name}"`, 'Decorator');
    return parseArgs(args, 3).forEach(({ cls, priority }) => pushWithPriority(target, key, MIDDLEWARES_METADATA, cls, priority));
  }
}