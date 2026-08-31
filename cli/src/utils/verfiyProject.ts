import fs from 'fs';
import path from 'path';
import { logger } from '../constant/logger';

export function verifyExpressXProject(): void {
    const pkgPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(pkgPath)) {
        const error = new Error('package.json not found in current directory.');
        logger.error(error.message, 'Project', error);
        throw error;
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (!deps['@expressx/core']) {
        const error = new Error('@expressxjs/core is not installed in this project, please run "npm install @expressxjs/core" or "yarn add @expressxjs/core"');
        logger.error(error.message, 'Project', error);
        throw error;
    }
}

