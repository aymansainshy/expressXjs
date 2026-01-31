import { Request } from "../../framework";





export abstract class Guard {
  abstract canActivate(req: Request): Promise<boolean> | boolean;
}


export async function runGuard(guard: Guard, req: Request): Promise<boolean> {
  const allowed = await guard.canActivate(req);
  if (!allowed) {
    return false;
  }
  return true;
}
