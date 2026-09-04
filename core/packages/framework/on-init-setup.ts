import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { RequestHandler } from 'express';
import { logger } from '../logger/logger';
import { ExpressXApp } from './types';

export type OnInitMiddleware = RequestHandler;
export type CorsOptions = NonNullable<Parameters<typeof cors>[0]>;
export type ExpressJsonOptions = NonNullable<Parameters<typeof express.json>[0]>;
export type ExpressUrlencodedOptions = NonNullable<Parameters<typeof express.urlencoded>[0]>;
export type HelmetOptions = NonNullable<Parameters<typeof helmet>[0]>;

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

  useExpressJson(options?: ExpressJsonOptions): this {
    return this.use(express.json(options));
  }

  useHelmet(options?: HelmetOptions): this {
    return this.use(helmet(options));
  }

  useUrlencoded(options?: ExpressUrlencodedOptions): this {
    return this.use(express.urlencoded(options));
  }

  useCors(options?: CorsOptions): this {
    return this.use(cors(options));
  }

  use(middleware: OnInitMiddleware): this {
    assertNotErrorMiddleware(middleware);
    logger.debug(`Registering onInit() middleware "${middleware.name || '(anonymous)'}"`, 'Startup');
    this.app.use(middleware as RequestHandler);
    return this;
  }
}
