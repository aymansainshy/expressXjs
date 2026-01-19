import { Ctx } from "@expressX/core/common";
import { Request } from "express";

export abstract class Guard {
  abstract canActivate(ctx: Ctx): Promise<boolean> | boolean;
}


export async function runGuard(guard: Guard, ctx: Ctx): Promise<boolean> {
  const allowed = await guard.canActivate(ctx);
  if (!allowed) {
    ctx.res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}
