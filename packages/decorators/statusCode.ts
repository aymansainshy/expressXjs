import { STATUS_CODE_METADATA } from "../common/constants";

export function StatusCode(code: number) {
  return (target: any, key: string) => {
    Reflect.defineMetadata(STATUS_CODE_METADATA, code, target, key);
  };
}