// --- Color Utilities ---
export const colors = {
  cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
  green: (str: string) => `\x1b[32m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
  red: (str: string) => `\x1b[31m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
  bold: (str: string) => `\x1b[1m${str}\x1b[0m`,
};
