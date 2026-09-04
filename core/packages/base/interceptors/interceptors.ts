import { HttpContext } from '../../framework/types';
import { logger } from '../../logger/logger';

export abstract class ExpressXInterceptor {
  abstract intercept(ctx: HttpContext, callHandler: Handler): Promise<any>;
}

export interface Handler {
  handle(): Promise<any>;
}

export async function runInterceptors(
  ctx: HttpContext,
  interceptors: ExpressXInterceptor[],
  last: () => Promise<any>,
): Promise<any> {
  const dispatch = async (idx: number): Promise<any> => {
    if (idx >= interceptors.length) return last();

    const current = interceptors[idx];
    logger.debug(
      `Running interceptor "${current.constructor.name}" (${idx + 1}/${interceptors.length})`,
      'Interceptor',
    );

    let downstream: Promise<any> | undefined;
    const callHandler: Handler = {
      handle: () => {
        downstream ??= dispatch(idx + 1);
        return downstream;
      },
    };

    return current.intercept(ctx, callHandler);
  };

  return dispatch(0);
}
