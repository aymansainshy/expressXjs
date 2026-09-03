import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExpressXScanner, FileCache } from './app.scanner';

describe('ExpressXScanner runtime selection', () => {
  const originalExpressXRuntime = process.env.EXPRESSX_RUNTIME;
  const originalNodeEnv = process.env.NODE_ENV;

  const cache: FileCache = {
    version: '1.0.0',
    decoratorFiles: [],
    totalScanned: 0,
    generatedAt: new Date(0).toISOString(),
    environment: 'development',
  };

  afterEach(() => {
    jest.restoreAllMocks();
    setEnvironmentVariable('EXPRESSX_RUNTIME', originalExpressXRuntime);
    setEnvironmentVariable('NODE_ENV', originalNodeEnv);
  });

  it.each([
    ['ts', 'production', true],
    ['js', 'development', true],
    ['js', 'production', false],
    [undefined, 'development', true],
    [undefined, 'production', false],
    [undefined, undefined, false],
  ])(
    'uses EXPRESSX_RUNTIME=%s and NODE_ENV=%s as TypeScript mode=%s',
    async (expressXRuntime, nodeEnv, expectedTypeScriptMode) => {
      setEnvironmentVariable('EXPRESSX_RUNTIME', expressXRuntime);
      setEnvironmentVariable('NODE_ENV', nodeEnv);

      const loadCache = jest.spyOn(ExpressXScanner, 'loadCache').mockReturnValue(cache);
      jest.spyOn(ExpressXScanner, 'importFromCache').mockResolvedValue(undefined);

      await ExpressXScanner.performScanning();

      expect(loadCache).toHaveBeenCalledWith(expectedTypeScriptMode);
    },
  );

  it('rejects unsupported EXPRESSX_RUNTIME values', async () => {
    setEnvironmentVariable('EXPRESSX_RUNTIME', 'typescript');

    await expect(ExpressXScanner.performScanning()).rejects.toThrow('EXPRESSX_RUNTIME must be either "ts" or "js"');
  });
});

describe('ExpressXScanner decorator detection', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'expressx-scanner-'));
  });

  afterEach(() => {
    fs.rmSync(workspace, {
      recursive: true,
      force: true,
    });
  });

  it.each([
    {
      name: 'aliased TypeScript decorator',
      extension: 'ts',
      isTypeScript: true,
      content: `import { Controller as ApiController } from '@expressxjs/core';\n@ApiController('/users') class Users {}`,
    },
    {
      name: 'TypeScript namespace decorator',
      extension: 'ts',
      isTypeScript: true,
      content: `import * as ExpressX from '@expressxjs/core';\n@ExpressX.Application() class App {}`,
    },
    {
      name: 'compiled CommonJS decorator call',
      extension: 'js',
      isTypeScript: false,
      content:
        `const core_1 = require('@expressxjs/core');\n` +
        `let Users = class Users {};\n` +
        `Users = __decorate([(0, core_1.Controller)('/users')], Users);`,
    },
  ])('detects $name', ({ extension, isTypeScript, content }) => {
    const filePath = writeFile(workspace, `component.${extension}`, content);
    expect(ExpressXScanner.fileContainsDecorators(filePath, isTypeScript)).toBe(true);
  });

  it('ignores decorator names in comments and strings', () => {
    const filePath = writeFile(
      workspace,
      'not-a-component.ts',
      `const example = '@Controller()';\n// @Application()\nclass PlainClass {}`,
    );

    expect(ExpressXScanner.fileContainsDecorators(filePath, true)).toBe(false);
  });
});

describe('ExpressXScanner cache validation', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'expressx-cache-'));
    writeFile(
      workspace,
      'package.json',
      JSON.stringify({
        expressx: {
          sourceDir: 'src',
          outDir: 'dist',
        },
      }),
    );
    fs.mkdirSync(path.join(workspace, 'src'), {
      recursive: true,
    });
    jest.spyOn(process, 'cwd').mockReturnValue(workspace);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(workspace, {
      recursive: true,
      force: true,
    });
  });

  it('writes and loads a valid development cache', () => {
    const cache = createCache();
    ExpressXScanner.saveCache(cache, true);

    expect(ExpressXScanner.loadCache(true)).toEqual(cache);
    expect(fs.readdirSync(path.join(workspace, 'src/.expressx'))).toEqual(['cache.json']);
  });

  it('rejects cache paths that escape the project', () => {
    const cache = createCache();
    cache.decoratorFiles.push({
      path: '../outside.ts',
      mtime: 1,
      size: 1,
    });
    const cacheDirectory = path.join(workspace, 'src/.expressx');
    fs.mkdirSync(cacheDirectory, {
      recursive: true,
    });
    fs.writeFileSync(path.join(cacheDirectory, 'cache.json'), JSON.stringify(cache));

    expect(ExpressXScanner.loadCache(true)).toBeNull();
  });
});

function setEnvironmentVariable(name: 'EXPRESSX_RUNTIME' | 'NODE_ENV', value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function writeFile(workspace: string, relativePath: string, content: string): string {
  const filePath = path.join(workspace, relativePath);
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true,
  });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function createCache(): FileCache {
  return {
    version: '1.0.0',
    decoratorFiles: [],
    totalScanned: 0,
    generatedAt: new Date(0).toISOString(),
    environment: 'development',
  };
}
