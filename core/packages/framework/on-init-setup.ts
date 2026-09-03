import type { RequestHandler } from 'express';
import { logger } from '../logger/logger';
import { ExpressXApp } from './types';

export type OnInitMiddleware = RequestHandler | ((req: any, res: any, next: any) => any);

function assertNotErrorMiddleware(fn: Function): void {
  if (fn.length >= 4) {
    const error = new Error(
      'Error middleware is not allowed in onInit(). Use @UseGlobalExceptionHandler() for application errors.',
    );
    logger.error(error.message, 'Startup', error);
    throw error;
  }
}

export class OnInitExpressXApp {
  constructor(private readonly app: ExpressXApp) {}

  use(middleware: OnInitMiddleware): this {
    assertNotErrorMiddleware(middleware);
    logger.debug(`Registering onInit() middleware "${middleware.name || '(anonymous)'}"`, 'Startup');
    this.app.use(middleware as RequestHandler);
    return this;
  }
}
