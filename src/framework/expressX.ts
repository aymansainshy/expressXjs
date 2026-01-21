
import { Express } from 'express';

export abstract class ExpressX {
  /** Lifecycle Hooks */
  public abstract preInit(): Promise<void>;
  public abstract onInit(app: Express): void;
  public abstract postInit(app: Express): void;
}






