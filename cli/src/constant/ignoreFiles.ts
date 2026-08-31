
import type { Stats } from 'node:fs';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.expressx'
]);

export function shouldIgnoreWatchPath(watchPath: string, stats?: Stats): boolean {
  const pathSegments = watchPath.split(/[\\/]/);

  if (pathSegments.some(segment => IGNORED_DIRECTORIES.has(segment))) {
    return true;
  }

  if (!stats?.isFile()) {
    return false;
  }

  return !watchPath.endsWith('.ts')
    || watchPath.endsWith('.spec.ts')
    || watchPath.endsWith('.test.ts');
}
