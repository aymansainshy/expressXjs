import {
  CorsOptions,
  ExpressJsonOptions,
  ExpressUrlencodedOptions,
  ExpressXApp,
  HelmetOptions,
  NextFn,
  Request,
  Response,
} from '..';
import { OnInitExpressXApp } from './on-init-setup';

describe('OnInitExpressXApp', () => {
  it('registers common middleware through chainable helpers with optional configuration', () => {
    const use = jest.fn();
    const setup = new OnInitExpressXApp({ use } as unknown as ExpressXApp);
    const jsonOptions: ExpressJsonOptions = { limit: '1mb', strict: true };
    const helmetOptions: Readonly<HelmetOptions> = { contentSecurityPolicy: false };
    const urlencodedOptions: ExpressUrlencodedOptions = { extended: true, parameterLimit: 500 };
    const corsOptions: CorsOptions = { origin: 'https://example.com', credentials: true };
    const customMiddleware = (_req: Request, _res: Response, next: NextFn): void => next();

    const result = setup
      .useExpressJson(jsonOptions)
      .useHelmet(helmetOptions)
      .useUrlencoded(urlencodedOptions)
      .useCors(corsOptions)
      .use(customMiddleware);

    expect(result).toBe(setup);
    expect(use).toHaveBeenCalledTimes(5);
    expect(use.mock.calls[4][0]).toBe(customMiddleware);
    for (const [middleware] of use.mock.calls) {
      expect(typeof middleware).toBe('function');
    }
  });

  it('supports every common middleware helper without options', () => {
    const use = jest.fn();
    const setup = new OnInitExpressXApp({ use } as unknown as ExpressXApp);

    const result = setup.useExpressJson().useHelmet().useUrlencoded().useCors();

    expect(result).toBe(setup);
    expect(use).toHaveBeenCalledTimes(4);
  });

  it('still rejects Express error middleware during onInit', () => {
    const setup = new OnInitExpressXApp({ use: jest.fn() } as unknown as ExpressXApp);
    const errorMiddleware = (_error: unknown, _req: Request, _res: Response, _next: NextFn): void => {};

    expect(() => setup.use(errorMiddleware as any)).toThrow(
      'Error middleware is not allowed in onInit(). Use @UseGlobalExceptionHandler() for application errors.',
    );
  });
});
