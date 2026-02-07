export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LoggerOptions {
  enableTimestamp?: boolean;
  enableColors?: boolean;
  minLevel?: LogLevel;
}

export class ExpressXLogger {
  private prefix = 'ExpressXjs';
  private options: Required<LoggerOptions>;

  private readonly colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Text colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    greenLight: '\x1b[92m',

    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgGreenLight: '\x1b[102m',
  };

  private readonly levelPriority = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.SUCCESS]: 2,
    [LogLevel.WARN]: 3,
    [LogLevel.ERROR]: 4,
  };

  constructor(options: LoggerOptions = {}) {
    this.options = {
      enableTimestamp: options.enableTimestamp ?? true,
      enableColors: options.enableColors ?? true,
      minLevel: options.minLevel ?? LogLevel.DEBUG,
    };
  }

  public debug(message: string, context?: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, context, meta);
  }

  public info(message: string, context?: string, meta?: any) {
    this.log(LogLevel.INFO, message, context, meta);
  }

  public success(message: string, context?: string, meta?: any) {
    this.log(LogLevel.SUCCESS, message, context, meta);
  }

  public warn(message: string, context?: string, meta?: any) {
    this.log(LogLevel.WARN, message, context, meta);
  }

  public error(message: string, context?: string, error?: Error | string) {
    this.log(LogLevel.ERROR, message, context);

    if (error instanceof Error) {
      console.error(this.colorize(this.colors.dim + this.colors.red, `  ↳ ${error.message}`));
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1);
        stackLines.forEach(line => {
          console.error(this.colorize(this.colors.gray, `    ${line.trim()}`));
        });
      }
    } else if (typeof error === 'string') {
      console.error(this.colorize(this.colors.dim + this.colors.red, `  ↳ ${error}`));
    }
  }

  private log(level: LogLevel, message: string, context?: string, meta?: any) {
    if (this.levelPriority[level] < this.levelPriority[this.options.minLevel]) {
      return;
    }

    const parts: string[] = [];

    // Timestamp
    if (this.options.enableTimestamp) {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');
      parts.push(this.colorize(this.colors.bgYellow + this.colors.black, timestamp));
    }

    // Level badge
    parts.push(this.getLevelBadge(level));

    // Prefix
    parts.push(this.colorize(this.colors.black + this.colors.green, `[${this.prefix}]`));

    // Context
    if (context) {
      parts.push(this.colorize(this.colors.magenta, `[${context}]`));
    }

    // Message
    parts.push(this.colorize(this.getMessageColor(level), message));

    console.log(parts.join(' '));

    // Metadata
    if (meta !== undefined) {
      const metaStr = typeof meta === 'object' ? JSON.stringify(meta, null, 2) : String(meta);
      console.log(this.colorize(this.colors.dim + this.colors.gray, `  ↳ ${metaStr}`));
    }
  }

  private getLevelBadge(level: LogLevel): string {
    const badges = {
      [LogLevel.DEBUG]: this.colorize(this.colors.bgBlue + this.colors.white + this.colors.bright, ` ${level} `),
      [LogLevel.INFO]: this.colorize(this.colors.bgGreenLight + this.colors.black + this.colors.bright, ` ${level} `),
      [LogLevel.SUCCESS]: this.colorize(this.colors.bgGreen + this.colors.white + this.colors.bright, ` ${level} `),
      [LogLevel.WARN]: this.colorize(this.colors.bgYellow + this.colors.black + this.colors.bright, ` ${level} `),
      [LogLevel.ERROR]: this.colorize(this.colors.bgRed + this.colors.white + this.colors.bright, ` ${level} `),
    };

    return badges[level];
  }

  private getMessageColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return this.colors.blue;
      case LogLevel.INFO: return this.colors.greenLight;
      case LogLevel.SUCCESS: return this.colors.green;
      case LogLevel.WARN: return this.colors.yellow;
      case LogLevel.ERROR: return this.colors.red;
      default: return this.colors.white;
    }
  }

  private colorize(color: string, text: string): string {
    if (!this.options.enableColors) {
      return text;
    }
    return `${color}${text}${this.colors.reset}`;
  }

  public setMinLevel(level: LogLevel) {
    this.options.minLevel = level;
  }

  public disableColors() {
    this.options.enableColors = false;
  }

  public enableColors() {
    this.options.enableColors = true;
  }
}