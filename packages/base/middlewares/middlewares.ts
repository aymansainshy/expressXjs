import { Request, Response } from "../../framework/types";


export abstract class ExpressXMiddleware {
  abstract use(req: Request, res: Response): Promise<void> | void;
}

