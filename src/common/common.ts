import { Request, Response } from "express";

export interface Ctx {
  req: Request;
  res: Response;
}

export type XNextFn<T = any> = () => Promise<T>;


export interface Options {
  prefix?: string;
  version?: string;
}