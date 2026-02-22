// framework/bootstrap-app.ts
import type { RequestHandler } from "express";
import { logger } from "../logger/logger";
import { ExpressXApp } from "./types";

export type OnInitMiddleware =
  // regular middleware only; error middleware is forbidden
  RequestHandler | ((req: any, res: any, next: any) => any);

function assertNotErrorMiddleware(fn: Function) {
  // error middleware signature: (err, req, res, next) => ...
  if (fn.length >= 4) {
    const error = new Error(
      `Error middleware is not allowed in onInit(). ` +
      `Use framework global error handler hooks / filters instead.`
    );
    logger.error(error.message, 'StartUp', error);
    throw error;
  }
}

export class OnInitExpressXApp {
  constructor(private readonly app: ExpressXApp) { }

  use(mw: OnInitMiddleware): this {
    assertNotErrorMiddleware(mw as any);
    this.app.use(mw as any);
    return this;
  }
}
