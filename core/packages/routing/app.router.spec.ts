import { Guard } from '../base/guards/guards';
import { ExpressXInterceptor, Handler } from '../base/interceptors/interceptors';
import { ExpressXMiddleware } from '../base/middlewares/middlewares';
import {
  Controller,
  GET,
  HttpContext,
  HttpResponse,
  Inject,
  Injectable,
  UseGuards,
  UseInterceptors,
  UseMiddlewares,
} from '..';
import { ExpressXContainer } from '../dicontainer';
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
