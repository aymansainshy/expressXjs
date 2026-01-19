import { Ctx } from "@expressX/core/common";

export abstract class Validator {
  abstract validate(ctx: Ctx): Promise<void> | void;
}