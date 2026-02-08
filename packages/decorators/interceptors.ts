import path from "path/win32";
import { ExpressXInterceptor } from "../base/interceptors/interceptors";
import { INTERCEPTOR_METADATA } from "../common";
import { parseArgs, pushWithPriority } from "./utilities";
import { ExpressXLogger } from "../logger";


const logger = new ExpressXLogger();

export function UseInterceptors(...args: any[]): MethodDecorator {

  return (target: Object, key: string | symbol) => {
    logger.debug(`Applying @UseInterceptors decorator to classs: ${args.map((a: any) => a.name).join(', ')} in method "${key as string}" of class "${target.constructor.name}"`, 'Decorator');
    return parseArgs(args, 4).forEach(({ cls, priority }) => pushWithPriority(target, key, INTERCEPTOR_METADATA, cls, priority));
  }
}

