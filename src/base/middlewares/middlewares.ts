import { Ctx, XNextFn } from "@expressX/core/common";

export abstract class ExpressXMiddleware {
  abstract use(ctx: Ctx): Promise<void> | void;
}

