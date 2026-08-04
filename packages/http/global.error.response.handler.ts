import { ExceptionHandler } from "../base/exceptionHandler/exception-handler";
import { HttpContext, NextFn, Response } from "../framework";
import { HttpErrorResponse } from "./http.error.response";

export class GlobalErrorResponseHandler {
  static async handleErrorResponse(
    handler: ExceptionHandler,
    error: any,
    res: Response,
    statusCode?: number,
  ) {

    try {
      const result: HttpErrorResponse | any = await handler.catch(error);
      if (res.headersSent) return;

      console.log("Result before handling:", result instanceof HttpErrorResponse);

      const status = result instanceof HttpErrorResponse ? result?.statusCode : statusCode || 400;
      const errorData = result instanceof HttpErrorResponse ? result?.error : result;

      res.status(status).json(errorData);
    } catch (err) {
      res.status(500).json({ error: 'An unexpected error occurred', details: err instanceof Error ? err.message : err });
    }
  }
}