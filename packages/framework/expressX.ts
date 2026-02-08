import { ExpressXApp } from "./types";



export abstract class ExpressX {
  /** Lifecycle Hooks */
  public abstract preInit(): Promise<void>;
  public abstract onInit(app: ExpressXApp): void;
  public abstract postInit(app: ExpressXApp): void;
}






