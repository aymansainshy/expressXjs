import { Ctx, HttpResponse, UseGlobalInterceptor } from '@expressxjs/core';
import { ExpressXInterceptor, Handler } from '../../core/dist/base/interceptors/interceptors';
import { HttpContext } from '../../core/dist/framework/types';

@UseGlobalInterceptor()
export class GlobalLogginInterceptor extends ExpressXInterceptor {
  async intercept(ctx: HttpContext, callHandler: Handler) {
    console.log(' GlobalLogginInterceptor :::::::: Interceptor Executed --  ');
    return callHandler.getData((result) => {
      if (result instanceof HttpResponse) {
        return {
          ok: true,
          data: result.data,
          traceId: ctx.req.ip,
        };
      } else {
        return {
          ok: true,
          data: result,
          traceId: ctx.req.headers['x-trace-id'] || null,
        };
      }
    });
  }
}

export class ResponseEnvelopeInterceptor extends ExpressXInterceptor {
  async intercept(ctx: HttpContext, callHandler: Handler) {
    console.log(' ResponseEnvelopeInterceptor :::::::: Interceptor Executed --  ');
    (ctx.req as any).user = {
      id: 1,
      name: 'Ayman',
    };
  }
}
