
import { logger } from "../logger/logger";
import { ExpressXApp } from "./types";


export function lockExpressXApp(app: ExpressXApp) {
  const denied = (name: string) => () => {
    const error = new Error(
      `[ExpressX] app is locked after bootstrap. ` +
      `Do not call app.${name}()/ app.get(). Use framework decorators instead.`
    );
    logger.error(error.message, `StartUp`, error);
    throw error;
  };

  // Keep original methods
  const originalUse = app.use.bind(app);
  const originalGet = app.get.bind(app);

  // Lock app.use completely
  (app as any).use = denied("use");

  // Lock route registration methods that are not overloaded for settings
  for (const m of ["post", "put", "patch", "delete", "options", "head", "all", "route"] as const) {
    if ((app as any)[m]) (app as any)[m] = denied(m);
  }

  // Special case: app.get is overloaded (settings getter + route registration)
  (app as any).get = function (...args: any[]) {
    // app.get("env") / app.get("trust proxy") -> allow (settings getter)
    if (args.length === 1 && typeof args[0] === "string") {
      return originalGet(args[0]);
    }

    // app.get(path, ...handlers) -> deny (route registration)
    const error = new Error(
      `ExpressX app is locked after bootstrap. ` +
      `Do not call app.get(path, ...handlers)/ app.get(). Use framework decorators instead.`
    );
    logger.error(error.message, `StartUp`, error);
    throw error;
  };

  // (Optional) lock .set() too if you don't want settings changes after bootstrap
  // const originalSet = app.set.bind(app);
  // (app as any).set = denied("set");
}