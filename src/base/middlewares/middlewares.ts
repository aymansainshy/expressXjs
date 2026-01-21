import { Ctx } from "../../common";


export abstract class ExpressXMiddleware {
  abstract use(ctx: Ctx): Promise<void> | void;
}

