import { ExceptionHandler } from '../base/exceptionHandler/exception-handler';
import { HttpContext, NextFn, Response } from '../framework';
import { logger } from '../logger/logger';
import { HttpErrorResponse } from './http.error.response';

export class GlobalExceptionResponseHandler {
  static async handleErrorResponse(handler: ExceptionHandler, error: any, res: Response, statusCode?: number) {
    try {
      logger.debug(`Delegating error to "${handler.constructor?.name}"`, 'ExceptionHandler');
      const result: HttpErrorResponse | any = await handler.catch(error);

      if (res.headersSent) {
        logger.warn('Response already sent - skipping the error response', 'ExceptionHandler');
        return;
      }

      const status = result instanceof HttpErrorResponse ? result?.statusCode : statusCode || 400;
      const errorData = result instanceof HttpErrorResponse ? result?.error : result;

      logger.debug(`Sending error response with status ${status}`, 'ExceptionHandler');
      res.status(status).json(errorData);
    } catch (err) {
      logger.error('Global exception handler threw while handling an error', 'ExceptionHandler', err as Error);
      res.status(500).json({
        error: 'An unexpected error occurred',
        details: err instanceof Error ? err.message : err,
      });
    }
  }
}
