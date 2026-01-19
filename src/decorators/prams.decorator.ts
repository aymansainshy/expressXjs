import { PARAM_METADATA } from "@expressX/core/common";


export enum ParamType {
  PARAM = "param",
  REQ = "req",
  RES = "res",
  NEXT = "expressNext",
  BODY = "body"
}

function addParamMetadata(target: any, methodName: any, paramIndex: number, type: ParamType, key?: string) {
  const existing = Reflect.getMetadata(PARAM_METADATA, target, methodName) || [];
  existing.push({ index: paramIndex, type, key });
  Reflect.defineMetadata(PARAM_METADATA, existing, target, methodName);
}

export function Param(key: string): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string, paramIndex, ParamType.PARAM, key);
  };
}

export function Req(): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string, paramIndex, ParamType.REQ);
  };
}

export function Res(): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string, paramIndex, ParamType.RES);
  };
}

export function Body(): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string, paramIndex, ParamType.BODY);
  };
}

export function Next(): ParameterDecorator {
  return (target, methodName, paramIndex) => {
    addParamMetadata(target, methodName as string, paramIndex, ParamType.NEXT);
  };
}
