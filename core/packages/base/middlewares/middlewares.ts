import { HttpContext, NextFn } from '../../framework/types';

export abstract class ExpressXMiddleware {
  abstract use(ctx: HttpContext, next: NextFn): Promise<void> | void;
}
