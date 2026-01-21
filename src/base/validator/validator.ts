import { Ctx } from "../../common";


export abstract class Validator {
  abstract validate(ctx: Ctx): Promise<void> | void;
}