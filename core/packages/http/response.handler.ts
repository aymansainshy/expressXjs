import { NextFn, Response } from '../framework';
import { logger } from '../logger/logger';
import { HttpResponse } from '../http/http.response';
import { HttpErrorResponse } from '../http/http.error.response';

export class HttpResponseHandler {
  static async handlerResponse(
    fn: () => Promise<any>,
    res: Response,
    next: NextFn,
    controllerStatus?: number,
    redirectUrl?: string,
  ) {
    try {
      const result: HttpResponse | HttpErrorResponse | any = await fn();
      if (res.headersSent) {
        logger.warn('Response already sent - skipping serialization', 'Response');
        return;
      }

      // If the result is an HttpResponse, use its status code and data.
      if (result instanceof HttpResponse) {
        const resolvedStatusCode = result.statusCode ?? controllerStatus;
        logger.debug(`Sending response with status ${resolvedStatusCode}`, 'Response');
        res.status(resolvedStatusCode).json(result.data);
        return;
      }

      // An HttpErrorResponse reaches here when an error was resolved inside the
      // interceptor chain and no interceptor reshaped it.
      if (result instanceof HttpErrorResponse) {
        logger.debug(`Sending error response with status ${result.statusCode}`, 'Response');
        res.status(result.statusCode ?? 500).json(result.error);
        return;
      }

      // Plain values use the controller status code or default to 200.
      const finalStatusCode = controllerStatus ?? 200;
      logger.debug(`Sending response with status ${finalStatusCode}`, 'Response');
      res.status(finalStatusCode).json(result);
    } catch (err) {
      logger.error('Failed to serialize the response', 'Response', err as Error);
      this.delegateUnknownErrorToExpressXHandler(err, next);
    }
  }

  static delegateUnknownErrorToExpressXHandler(err: any, next: NextFn) {
    logger.debug('Passing error to the ExpressX error handler', 'Response');
    next(err);
  }
}
