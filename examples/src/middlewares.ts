import { ExpressXMiddleware, HttpContext, NextFn } from '@expressxjs/core';

export class LoggerMiddleware extends ExpressXMiddleware {
  use(ctx: HttpContext, next: NextFn): void {
    console.log('LoggerMiddleware executed');
    console.log(`Request received: ${ctx.req.method} ${ctx.req.url}`);
    const error = new Error('Simulated error in LoggerMiddleware');
    next();
  }
}

export class AuthMiddleware extends ExpressXMiddleware {
  use(ctx: HttpContext, next: NextFn): void {
    console.log('AuthMiddleware executed');
    // Simulate authentication check
    const isAuthenticated = true; // Change this to false to simulate unauthenticated access
    if (!isAuthenticated) {
      const error = new Error('Unauthorized access');
      next(error);
      return;
    }
    next();
  }
}
