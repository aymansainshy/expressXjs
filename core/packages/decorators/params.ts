import { PARAM_METADATA } from '../common';
import { logger } from '../logger/logger';

export enum ParamType {
  PARAM = 'param',
  REQ = 'req',
  RES = 'res',
  CTX = 'ctx',
  NEXT = 'expressNext',
  BODY = 'body',
}

function addParamMetadata(
  target: object,
  methodName: string | symbol,
  paramIndex: number,
  type: ParamType,
  key?: string,
): void {
  logger.debug(
    `Applying @${type} decorator to method "${String(methodName)}" in class "${target.constructor.name}"`,
    'Decorator',
  );
  const existing = Reflect.getMetadata(PARAM_METADATA, target, methodName) || [];
  existing.push({
    index: paramIndex,
    type,
    key,
  });
  Reflect.defineMetadata(PARAM_METADATA, existing, target, methodName);
}

export function Param(key: string): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string | symbol, paramIndex, ParamType.PARAM, key);
  };
}

export function Ctx(): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string | symbol, paramIndex, ParamType.CTX);
  };
}

export function Body(): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string | symbol, paramIndex, ParamType.BODY);
  };
}

export function Next(): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string | symbol, paramIndex, ParamType.NEXT);
  };
}
