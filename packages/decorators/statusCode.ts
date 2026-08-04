import { STATUS_CODE_METADATA } from "../common/constants";
import { logger } from "../logger/logger";

export function StatusCode(code: number) {
  return (target: any, key: string) => {
    logger.debug(`Applying @StatusCode decorator to method "${key}" in class "${target.constructor.name}" with code: ${code}`, 'Decorator');
    Reflect.defineMetadata(STATUS_CODE_METADATA, code, target, key);
  };
}