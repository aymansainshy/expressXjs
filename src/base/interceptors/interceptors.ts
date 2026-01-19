import { Ctx, XNextFn } from "@expressX/core/common";

// export abstract class Interceptor {
//   abstract intercept(ctx: Ctx, next: XNextFn<any>): Promise<any>;
// }

export interface InterceptorHooks {
  before?(ctx: Ctx): Promise<void> | void;
  after?(ctx: Ctx, result: any): Promise<any> | any;
  onError?(ctx: Ctx, error: any): Promise<void> | void;
}

export abstract class Interceptor implements InterceptorHooks {
  // Logic is optional; users only override what they need
  async before(ctx: Ctx): Promise<void> { }
  async after(ctx: Ctx, result: any): Promise<any> { return result; }
  async onError(ctx: Ctx, error: any): Promise<void> { throw error; }
}