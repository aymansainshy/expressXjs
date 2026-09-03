import type { Stats } from 'node:fs';

const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', '.git', '.expressx']);

export function shouldIgnoreWatchPath(watchPath: string, stats?: Stats): boolean {
  const pathSegments = watchPath.split(/[\\/]/);

  if (pathSegments.some((segment) => IGNORED_DIRECTORIES.has(segment))) {
    return true;
  }

  if (!stats?.isFile()) {
    return false;
  }

  const isTypeScript = /\.(?:ts|tsx|mts|cts)$/.test(watchPath);
  const isTestFile = /\.(?:spec|test)\.(?:ts|tsx|mts|cts)$/.test(watchPath);
  const isDeclaration = /\.d\.(?:ts|mts|cts)$/.test(watchPath);

  return !isTypeScript || isTestFile || isDeclaration;
}
