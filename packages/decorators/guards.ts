
import { GUARDS_METADATA } from "../common";
import { parseArgs, pushWithPriority } from "./utilities";

export function UseGuards(...args: any[]) {
  return (target: Object, key: string | symbol) => parseArgs(args, 1).forEach(({ cls, priority }) => pushWithPriority(target, key, GUARDS_METADATA, cls, priority));
}