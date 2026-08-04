
import { logger } from "../logger/logger";

export class ControllerRegistry {
  public static readonly controllers: any[] = [];
  public static add(target: any) {
    if (this.controllers.includes(target)) {
      logger.warn(`Controller "${target.name}" is already registered - ignoring duplicate`, 'Router');
      return;
    }
    this.controllers.push(target);
    logger.debug(`Added controller "${target.name}" to the registry (total: ${this.controllers.length})`, 'Router');
  }
}