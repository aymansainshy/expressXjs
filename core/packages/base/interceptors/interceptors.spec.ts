import { HttpContext } from '../../framework/types';
import { ExpressXInterceptor, Handler, runInterceptors } from './interceptors';

const ctx = {} as HttpContext;

describe('runInterceptors', () => {
  it('runs the downstream handler once when an interceptor discards its result', async () => {
    class DiscardingInterceptor extends ExpressXInterceptor {
      async intercept(_ctx: HttpContext, callHandler: Handler): Promise<any> {
        await callHandler.handle();
      }
    }

    const handler = jest.fn().mockResolvedValue('controller result');

    await expect(runInterceptors(ctx, [new DiscardingInterceptor()], handler)).resolves.toBeUndefined();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns transformed results through the interceptor chain', async () => {
    class InnerInterceptor extends ExpressXInterceptor {
      async intercept(_ctx: HttpContext, callHandler: Handler): Promise<any> {
        const result = await callHandler.handle();
        return `inner(${result})`;
      }
    }

    class OuterInterceptor extends ExpressXInterceptor {
      async intercept(_ctx: HttpContext, callHandler: Handler): Promise<any> {
        const result = await callHandler.handle();
        return `outer(${result})`;
      }
    }

    const handler = jest.fn().mockResolvedValue('controller');

    await expect(runInterceptors(ctx, [new OuterInterceptor(), new InnerInterceptor()], handler)).resolves.toBe(
      'outer(inner(controller))',
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not run downstream when an interceptor short-circuits', async () => {
    class ShortCircuitInterceptor extends ExpressXInterceptor {
      async intercept(): Promise<any> {
        return 'blocked';
      }
    }

    const handler = jest.fn().mockResolvedValue('controller');

    await expect(runInterceptors(ctx, [new ShortCircuitInterceptor()], handler)).resolves.toBe('blocked');
    expect(handler).not.toHaveBeenCalled();
  });

  it('reuses the downstream result when handle is called more than once', async () => {
    class RepeatingInterceptor extends ExpressXInterceptor {
      async intercept(_ctx: HttpContext, callHandler: Handler): Promise<any> {
        const first = await callHandler.handle();
        const second = await callHandler.handle();
        return [first, second];
      }
    }

    const handler = jest.fn().mockResolvedValue('controller');

    await expect(runInterceptors(ctx, [new RepeatingInterceptor()], handler)).resolves.toEqual([
      'controller',
      'controller',
    ]);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
