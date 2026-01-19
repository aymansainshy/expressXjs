import { Ctx, XNextFn } from "@expressX/core/common";

export abstract class Middleware {
  abstract use(ctx: Ctx, next: XNextFn<void>): Promise<void> | void;
}


export async function composeClassMiddlewares(middlewares: any[], finalHandler: () => Promise<any>, ctx: Ctx): Promise<any> {
  let i = -1;
  const next = async () => {
    i++;
    if (i < middlewares.length) {
      return new middlewares[i]().use(ctx, next);
    }
    return finalHandler();
  };
  return next();
}
