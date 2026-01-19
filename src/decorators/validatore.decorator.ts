import { VALIDATOR_METADATA } from "../common";
import { parseArgs, pushWithPriority } from "./utilities";

export function UseValidators(...args: any[]) {
  return (target: Object, key: string | symbol) => parseArgs(args, 2).forEach(({ cls, priority }) => pushWithPriority(target, key, VALIDATOR_METADATA, cls, priority));
}
