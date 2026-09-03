import { Request, Response } from '../../framework';
import { HttpContext } from '../../framework/types';
import { logger } from '../../logger/logger';

export abstract class ExpressXInterceptor {
  abstract intercept(ctx: HttpContext, callHandler: Handler): Promise<any>;
}

export type DataTransform = (data: any) => any | Promise<any>;

export interface Handler {
  handle(): Promise<any>;
  getData(transform?: DataTransform): Promise<any>;
}

export async function runInterceptors(
  ctx: HttpContext,
  interceptors: ExpressXInterceptor[],
  last: () => Promise<any>,
): Promise<any> {
  let idx = -1;

  const dispatch = async (): Promise<any> => {
    idx++;
    if (idx >= interceptors.length) return last();

    const current = interceptors[idx];
    logger.debug(
      `Running interceptor "${current.constructor.name}" (${idx + 1}/${interceptors.length})`,
      'Interceptor',
    );

    const callHandler: Handler = {
      handle: () => dispatch(),
      getData: async (transform) => {
        const data = await dispatch();
        return transform ? transform(data) : data;
      },
    };

    const out = await current.intercept(ctx, callHandler);
    if (out === undefined) {
      logger.debug(`Interceptor "${current.constructor.name}" returned no value - continuing the chain`, 'Interceptor');
      return dispatch();
    }

    // Otherwise, the interceptor returned a final result (possibly transformed).
    return out;
  };

  return dispatch();
}
