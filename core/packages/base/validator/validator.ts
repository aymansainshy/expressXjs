import { Request, Response } from "../../framework/types";


export abstract class Validator {
  abstract validate(req: Request, res: Response): Promise<any>;
}