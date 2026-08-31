

import { NextFn, Response } from "../framework";
import { logger } from "../logger/logger";
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
      if (res.headersSent) {
        logger.warn('Response already sent - skipping serialization', 'Response');
        return;
      }

      // An HttpErrorResponse reaches here when an error was resolved inside the
      // interceptor chain and no interceptor reshaped it.
      const status = result instanceof HttpResponse ? result?.code
        : result instanceof HttpErrorResponse ? result?.statusCode
          : statusCode || 200;
      const data = result instanceof HttpResponse ? result?.data
        : result instanceof HttpErrorResponse ? result?.error
          : result;

      logger.debug(`Sending response with status ${status}`, 'Response');
      res.status(status).json(data);
    } catch (err) {
      logger.error('Failed to serialize the response', 'Response', err as Error);
      this.handleError(err, next);
    }
  }

  static handleError(err: any, next: NextFn) {
    logger.debug('Passing error to the Express error handler', 'Response');
    next(err);
  }
}