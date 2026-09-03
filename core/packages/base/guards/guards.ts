import { Request } from '../../framework';
import { logger } from '../../logger/logger';

export abstract class Guard {
  abstract canActivate(req: Request): Promise<boolean> | boolean;
}

export async function runGuard(guard: Guard, req: Request): Promise<boolean> {
  try {
    const allowed = await guard.canActivate(req);
    if (!allowed) {
      logger.warn(`Guard "${guard.constructor.name}" denied [${req.method}] ${req.originalUrl}`, 'Guard');
      return false;
    }
    return true;
  } catch (err) {
    logger.error(`Guard "${guard.constructor.name}" threw while evaluating the request`, 'Guard', err as Error);
    throw err;
  }
}
