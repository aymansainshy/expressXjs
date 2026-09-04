import { ExpressXInterceptor, Handler, HttpContext, UseGlobalInterceptor } from '@expressxjs/core';

@UseGlobalInterceptor()
export class GlobalLogginInterceptor extends ExpressXInterceptor {
  async intercept(ctx: HttpContext, callHandler: Handler) {
    console.log(' GlobalLogginInterceptor :::::::: Interceptor Executed -- Before ');
    const result = await callHandler.handle();
    console.log(' GlobalLogginInterceptor :::::::: Interceptor Executed -- After ');

    return {
      ok: true,
      data: result,
      traceId: ctx.req.headers['x-trace-id'] || null,
    };
  }
}

export class ResponseEnvelopeInterceptor extends ExpressXInterceptor {
  async intercept(ctx: HttpContext, callHandler: Handler) {
    console.log(' ResponseEnvelopeInterceptor :::::::: Interceptor Executed Before--  ');
    (ctx.req as any).user = {
      id: 1,
      name: 'Ayman',
    };
    const result = await callHandler.handle();
    console.log(' ResponseEnvelopeInterceptor :::::::: Interceptor Executed After--  ');
    return result;
  }
}
