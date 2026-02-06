import { ExpressXInterceptor } from "../base/interceptors/interceptors";
import { INTERCEPTOR_METADATA } from "../common";
import { parseArgs, pushWithPriority } from "./utilities";



export function UseInterceptors(...args: any[]): MethodDecorator {
  return (target: Object, key: string | symbol) => parseArgs(args, 4).forEach(({ cls, priority }) => pushWithPriority(target, key, INTERCEPTOR_METADATA, cls, priority));
}

