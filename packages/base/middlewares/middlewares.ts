import { Ctx } from "../../framework/types";


export abstract class ExpressXMiddleware {
  abstract use(ctx: Ctx): Promise<any> | any;
}

