import { Request, Response } from "../../framework";




export abstract class ExpressXInterceptor {
  abstract before(req: Request): Promise<void>;
  abstract after(res: Response, result: any): Promise<any>;
  abstract onError(error: any): Promise<void>;
}
