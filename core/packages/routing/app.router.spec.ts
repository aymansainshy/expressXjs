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

  use(): void {
    this.recorder.events.push('middleware');
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
