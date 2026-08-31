import { ExpressXMiddleware } from "@expressxjs/core";
import { HttpContext } from "../../core/dist/framework/types";

export class LoggerMiddleware extends ExpressXMiddleware {
  use(ctx: HttpContext) {
    console.log("LoggerMiddleware executed");
    console.log(`Request received: ${ctx.req.method} ${ctx.req.url}`);
  }
}
