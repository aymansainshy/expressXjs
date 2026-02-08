import { Request, Response } from "../../framework";
import { Ctx } from "../../framework/types";

export abstract class ExpressXInterceptor {
  abstract intercept(ctx: Ctx, callHandler: Handler): Promise<any>;
}


export type DataTransform = (data: any) => any | Promise<any>;

export interface Handler {
  handle(): Promise<any>;
  getData(transform?: DataTransform): Promise<any>;
}


export async function runInterceptors(
  ctx: Ctx,
  interceptors: ExpressXInterceptor[],
  last: () => Promise<any>
): Promise<any> {
  let idx = -1;

  const dispatch = async (): Promise<any> => {
    idx++;
    if (idx >= interceptors.length) return last();

    const current = interceptors[idx];

    const callHandler: Handler = {
      handle: () => dispatch(),
      getData: async (transform) => {
        const data = await dispatch();
        return transform ? transform(data) : data;
      }
    };

    const out = await current.intercept(ctx, callHandler);
    if (out === undefined) {
      return dispatch();
    }

    // ✅ otherwise, interceptor returned a final result (maybe transformed)
    return out;

  };

  return dispatch();
}


