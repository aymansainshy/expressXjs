

import { NextFn, Response } from "../framework";
import { HttpResponse } from "../http/http.response";
import { HttpErrorResponse } from "../http/http.error.response";


export class HttpResponseHandler {
  static async handlerResponse(
    fn: () => Promise<any>,
    res: Response,
    next: NextFn,
    statusCode?: number,
    redirectUrl?: string
  ) {
    try {
      const result: HttpResponse | any = await fn();
      if (res.headersSent) return;

      // An HttpErrorResponse reaches here when an error was resolved inside the
      // interceptor chain and no interceptor reshaped it.
      const status = result instanceof HttpResponse ? result?.code
        : result instanceof HttpErrorResponse ? result?.statusCode
          : statusCode || 200;
      const data = result instanceof HttpResponse ? result?.data
        : result instanceof HttpErrorResponse ? result?.error
          : result;

      res.status(status).json(data);
    } catch (err) {
      this.handleError(err, next);
    }
  }

  static handleError(err: any, next: NextFn) {
    next(err);
  }
}