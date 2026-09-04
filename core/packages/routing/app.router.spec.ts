import { Guard } from '../base/guards/guards';
import { ExpressXInterceptor, Handler } from '../base/interceptors/interceptors';
import { ExpressXMiddleware } from '../base/middlewares/middlewares';
import {
  Controller,
  GET,
  HttpContext,
  HttpErrorResponse,
  HttpResponse,
  Inject,
  Injectable,
  NextFn,
  UseGuards,
  UseInterceptors,
  UseMiddlewares,
} from '..';
import { ExpressXContainer } from '../dicontainer';
import { GLOBAL_EXCEPTION_HANDLER } from '../common/constants';
import { AppRouter } from './app.router';

@Injectable()
class PipelineRecorder {
  readonly events: string[] = [];
}

@Injectable()
class InjectedGuard extends Guard {
  constructor(@Inject(PipelineRecorder) private readonly recorder: PipelineRecorder) {
    super();
  }

  canActivate(): boolean {
    this.recorder.events.push('guard');
    return true;
  }
}

@Injectable()
class InjectedMiddleware extends ExpressXMiddleware {
  constructor(@Inject(PipelineRecorder) private readonly recorder: PipelineRecorder) {
    super();
  }

  use(_ctx: HttpContext, next: NextFn): void {
    this.recorder.events.push('middleware');
    next();
  }
}

const nextFnEvents: string[] = [];

class FirstMiddleware extends ExpressXMiddleware {
  use(_ctx: HttpContext, next: NextFn): void {
    nextFnEvents.push('md1');
    next();
  }
}

class SecondMiddleware extends ExpressXMiddleware {
  use(_ctx: HttpContext, next: NextFn): void {
    nextFnEvents.push('md2');
    next();
  }
}

class PriorityGuard extends Guard {
  canActivate(): boolean {
    nextFnEvents.push('guard');
    return true;
  }
}

class ThirdMiddleware extends ExpressXMiddleware {
  use(_ctx: HttpContext, next: NextFn): void {
    nextFnEvents.push('md3');
    next();
  }
}

class FourthMiddleware extends ExpressXMiddleware {
  use(_ctx: HttpContext, next: NextFn): void {
    nextFnEvents.push('md4');
    next();
  }
}

@Controller('/next-fn')
class NextFnController {
  @GET('/ordered')
  @UseMiddlewares(FirstMiddleware, SecondMiddleware, 2)
  @UseGuards(PriorityGuard, 3)
  @UseMiddlewares(ThirdMiddleware, FourthMiddleware, 4)
  ordered(): HttpResponse<{ ok: boolean }> {
    nextFnEvents.push('controller');
    return HttpResponse.ok({ ok: true });
  }
}

const stoppedPipelineEvents: string[] = [];

class StoppingMiddleware extends ExpressXMiddleware {
  use(): void {
    stoppedPipelineEvents.push('stopped');
  }
}

class SkippedMiddleware extends ExpressXMiddleware {
  use(_ctx: HttpContext, next: NextFn): void {
    stoppedPipelineEvents.push('skipped-middleware');
    next();
  }
}

@Controller('/next-fn-stop')
class StoppedPipelineController {
  @GET('/')
  @UseMiddlewares(StoppingMiddleware, SkippedMiddleware)
  handle(): HttpResponse<{ ok: boolean }> {
    stoppedPipelineEvents.push('controller');
    return HttpResponse.ok({ ok: true });
  }
}

let doubleNextControllerCalls = 0;

class DoubleNextMiddleware extends ExpressXMiddleware {
  use(_ctx: HttpContext, next: NextFn): void {
    next();
    next();
  }
}

@Controller('/next-fn-twice')
class DoubleNextController {
  @GET('/')
  @UseMiddlewares(DoubleNextMiddleware)
  handle(): HttpResponse<{ ok: boolean }> {
    doubleNextControllerCalls++;
    return HttpResponse.ok({ ok: true });
  }
}

const middlewareNextError = new Error('Middleware failed');
let nextErrorControllerCalls = 0;

class ErrorForwardingMiddleware extends ExpressXMiddleware {
  use(_ctx: HttpContext, next: NextFn): void {
    next(middlewareNextError);
  }
}

@Controller('/next-fn-error')
class NextErrorController {
  @GET('/')
  @UseMiddlewares(ErrorForwardingMiddleware)
  handle(): HttpResponse<{ ok: boolean }> {
    nextErrorControllerCalls++;
    return HttpResponse.ok({ ok: true });
  }
}

@Injectable()
class EarlyInterceptor extends ExpressXInterceptor {
  constructor(@Inject(PipelineRecorder) private readonly recorder: PipelineRecorder) {
    super();
  }

  async intercept(_ctx: HttpContext, callHandler: Handler): Promise<unknown> {
    this.recorder.events.push('early-before');
    const result = await callHandler.handle();
    this.recorder.events.push('early-after');
    return result;
  }
}

@Injectable()
class LateInterceptor extends ExpressXInterceptor {
  constructor(@Inject(PipelineRecorder) private readonly recorder: PipelineRecorder) {
    super();
  }

  async intercept(_ctx: HttpContext, callHandler: Handler): Promise<unknown> {
    this.recorder.events.push('late-before');
    const result = await callHandler.handle();
    this.recorder.events.push('late-after');
    return result;
  }
}

@Controller('/pipeline')
class PipelineController {
  constructor(@Inject(PipelineRecorder) private readonly recorder: PipelineRecorder) {}

  @GET('/')
  @UseGuards(InjectedGuard)
  @UseMiddlewares(InjectedMiddleware)
  @UseInterceptors(LateInterceptor, 20)
  @UseInterceptors(EarlyInterceptor, 10)
  handle(): HttpResponse<{ ok: boolean }> {
    this.recorder.events.push('controller');
    return HttpResponse.ok({
      ok: true,
    });
  }
}

@Injectable()
class ErrorObservingInterceptor extends ExpressXInterceptor {
  static readonly observedErrors: unknown[] = [];

  async intercept(_ctx: HttpContext, callHandler: Handler): Promise<unknown> {
    try {
      return await callHandler.handle();
    } catch (error) {
      ErrorObservingInterceptor.observedErrors.push(error);
      throw error;
    }
  }
}

@Controller('/exception')
class ThrowingController {
  @GET('/')
  @UseInterceptors(ErrorObservingInterceptor)
  handle(): never {
    throw new Error('Controller failed');
  }
}

describe('AppRouter pipeline resolution', () => {
  it('resolves pipeline components through DI and applies interceptor priority', async () => {
    const recorder = ExpressXContainer.resolve(PipelineRecorder);
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/pipeline/');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/pipeline/',
        params: {},
      },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      ok: true,
    });
    expect(next).not.toHaveBeenCalled();
    expect(recorder.events).toEqual([
      'guard',
      'middleware',
      'early-before',
      'late-before',
      'controller',
      'late-after',
      'early-after',
    ]);
  });

  it('requires each middleware to call next and preserves same-priority declaration order', async () => {
    nextFnEvents.length = 0;
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/next-fn/ordered');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/next-fn/ordered',
        params: {},
      },
      response,
      next,
    );

    expect(nextFnEvents).toEqual(['md1', 'md2', 'guard', 'md3', 'md4', 'controller']);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('stops the remaining pipeline and skips response serialization when next is not called', async () => {
    stoppedPipelineEvents.length = 0;
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/next-fn-stop/');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/next-fn-stop/',
        params: {},
      },
      response,
      next,
    );

    expect(stoppedPipelineEvents).toEqual(['stopped']);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('runs the downstream pipeline only once when next is called repeatedly', async () => {
    doubleNextControllerCalls = 0;
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/next-fn-twice/');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/next-fn-twice/',
        params: {},
      },
      response,
      next,
    );

    expect(doubleNextControllerCalls).toBe(1);
    expect(response.status).toHaveBeenCalledTimes(1);
    expect(response.json).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('delegates next(error) to the Express error pipeline and stops the route pipeline', async () => {
    nextErrorControllerCalls = 0;
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/next-fn-error/');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/next-fn-error/',
        params: {},
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(middlewareNextError);
    expect(nextErrorControllerCalls).toBe(0);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
});

describe('AppRouter exception resolution', () => {
  it('serializes an async HttpErrorResponse returned by the application exception handler', async () => {
    ErrorObservingInterceptor.observedErrors.length = 0;
    const handledError = new HttpErrorResponse(422, {
      message: 'Handled by the application',
    });
    const catchError = jest.fn().mockResolvedValue(handledError);
    ExpressXContainer.register(GLOBAL_EXCEPTION_HANDLER, {
      useValue: {
        catch: catchError,
      },
    });
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/exception/');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/exception/',
        params: {},
      },
      response,
      next,
    );

    expect(catchError).toHaveBeenCalledTimes(1);
    expect(ErrorObservingInterceptor.observedErrors).toHaveLength(1);
    expect(ErrorObservingInterceptor.observedErrors[0]).toEqual(
      expect.objectContaining({
        message: 'Controller failed',
      }),
    );
    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Handled by the application',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a value that is not an HttpErrorResponse at runtime', async () => {
    const catchError = jest.fn().mockReturnValue('invalid response');
    ExpressXContainer.register(GLOBAL_EXCEPTION_HANDLER, {
      useValue: {
        catch: catchError,
      },
    });
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/exception/');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/exception/',
        params: {},
      },
      response,
      next,
    );

    expect(catchError).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Global exception handler must return an HttpErrorResponse.',
      }),
    );
  });

  it('does not invoke the application exception handler again when it throws', async () => {
    const handlerFailure = new Error('Exception handler failed');
    const catchError = jest.fn().mockRejectedValue(handlerFailure);
    ExpressXContainer.register(GLOBAL_EXCEPTION_HANDLER, {
      useValue: {
        catch: catchError,
      },
    });
    const router = new AppRouter().getRouter() as any;
    const routeLayer = router.stack.find((layer: any) => layer.route?.path === '/exception/');
    const routeHandler = routeLayer.route.stack[0].handle;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await routeHandler(
      {
        method: 'GET',
        originalUrl: '/exception/',
        params: {},
      },
      response,
      next,
    );

    expect(catchError).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(handlerFailure);
  });
});
