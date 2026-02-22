import { HttpContext } from "../../framework/types";


export abstract class ExpressXMiddleware {
  abstract use(ctx: HttpContext): Promise<void> | void;
}

