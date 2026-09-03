import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../constant/logger';

export function verifyExpressXProject(): void {
  const pkgPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {
    const error = new Error('package.json not found in the current directory.');
    logger.error(error.message, 'Project', error);
    throw error;
  }

  let pkg: Record<string, any>;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, any>;
  } catch (cause) {
    const error = new Error(`Could not parse package.json: ${(cause as Error).message}`);
    logger.error(error.message, 'Project', error);
    throw error;
  }

  const dependencies = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (!dependencies['@expressxjs/core']) {
    const error = new Error(
      '@expressxjs/core is not installed. Run "npm install @expressxjs/core" before using the ExpressX CLI.',
    );
    logger.error(error.message, 'Project', error);
    throw error;
  }
}
