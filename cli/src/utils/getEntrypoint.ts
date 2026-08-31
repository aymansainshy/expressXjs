import path from 'path';
import fs from 'fs';
import { logger } from '../constant/logger';

// --- Configuration ---
const FALLBACK_ENTRIES = [
    'src/main.ts',
    'src/index.ts',
    'main.ts',
    'index.ts'
];

/**
 * Resolves the absolute path and prefers .ts over .js versions.
 */
function resolveWithPriority(root: string, entryPath: string): string | null {
    const absolutePath = path.resolve(root, entryPath);
    // Prefer TypeScript source if it exists
    const tsVersion = absolutePath.replace(/\.(js|mjs|cjs)$/, '.ts');

    if (fs.existsSync(tsVersion)) return tsVersion;
    if (fs.existsSync(absolutePath)) return absolutePath;

    return null;
}

export function getEntrypoint(): string {
    const root = process.cwd();
    const pkgPath = path.join(root, 'package.json');

    if (!fs.existsSync(pkgPath)) {
        throw new Error('package.json not found in current directory.');
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    // 1. Try custom property: pkg.expressx.main
    const expxMain = pkg.expressx?.main;
    if (expxMain) {
        const resolved = resolveWithPriority(root, expxMain);
        if (resolved) {
            logger.debug(`Entrypoint resolved from "expressx.main": ${resolved}`, 'Startup');
            return resolved;
        }
        logger.warn(`"expressx.main" points to "${expxMain}" which does not exist - falling back to defaults`, 'Startup');
    }

    // 2. Fallback to common defaults (uncommented and improved)
    for (const file of FALLBACK_ENTRIES) {
        const fullPath = path.join(root, file);
        if (fs.existsSync(fullPath)) {
            logger.debug(`Entrypoint resolved from fallback: ${fullPath}`, 'Startup');
            return fullPath;
        }
    }

    const errorMessage = [
        'Could not find an application entrypoint.',
        'Please define "expressx.main" in your package.json, or ensure "src/main.ts, src/index.ts, index.ts, main.ts" exists.',
        '\nExample package.json configuration:',
        JSON.stringify({
            expressx: {
                sourceDir: "src",
                outDir: "dist",
                main: "src/index.ts"
            }
        }, null, 2),
        '\n'
    ].join('\n');

    throw new Error(errorMessage);
}