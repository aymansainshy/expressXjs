

import { NextFn, Response } from "../framework";
import { HttpResponse } from "../http/http.response";


export class HttpResponseHandler {
  static async handlerResponse(fn: () => Promise<any>, res: Response, next: NextFn) {
    try {
      const result = await fn();
      if (res.headersSent) return;

      const status = result instanceof HttpResponse ? result.statusCode : 200;
      const data = result instanceof HttpResponse ? result.data : result;

      res.status(status).json(data);
    } catch (err) {
      this.handleError(err, next);
    }
  }

  static handleError(err: any, next: NextFn) {
    next(err);
  }
}