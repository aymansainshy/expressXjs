import { Ctx, XNextFn } from "@expressX/core/common";


export abstract class ExpressXInterceptor {
  abstract before(ctx: Ctx): Promise<void>;
  abstract after(ctx: Ctx, result: any): Promise<any>;
  abstract onError(ctx: Ctx, error: any): Promise<void>;
}