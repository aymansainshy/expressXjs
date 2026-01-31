import { MIDDLEWARES_METADATA } from "../common";
import { parseArgs, pushWithPriority } from "./utilities";





export function UseMiddlewares(...args: any[]) {
  return (target: Object, key: string | symbol) => parseArgs(args, 3).forEach(({ cls, priority }) => pushWithPriority(target, key, MIDDLEWARES_METADATA, cls, priority));
}