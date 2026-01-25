import { singleton } from "tsyringe";

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export class ExpressXLogger {
  private prefix = '[ExpressX]';

  public info(message: string, context?: string) {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: string) {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, context?: string, stack?: string) {
    this.log(LogLevel.ERROR, message, context);
    if (stack) console.error(stack);
  }

  private log(level: LogLevel, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const ctx = context ? ` \x1b[33m[${context}]\x1b[0m` : '';
    const color = this.getColor(level);

    console.log(`${timestamp} ${color}${level}\x1b[0m ${this.prefix}${ctx} ${message}`);
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO: return '\x1b[32m'; // Green
      case LogLevel.WARN: return '\x1b[33m'; // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      default: return '\x1b[37m'; // White
    }
  }
}