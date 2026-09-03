const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildCommand } = require('../dist/utils/builder.js');

test(
  'writes a custom-output production cache to the requested directory',
  {
    concurrency: false,
  },
  async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'expressx-builder-'));
    fs.mkdirSync(path.join(workspace, 'src'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(workspace, 'package.json'),
      JSON.stringify({
        expressx: {
          sourceDir: './src',
          outDir: 'dist',
          main: 'src/index.ts',
        },
      }),
    );
    fs.writeFileSync(
      path.join(workspace, 'src/application.ts'),
      `import { Application } from '@expressxjs/core';\n@Application() class TestApplication {}`,
    );

    const previousDirectory = process.cwd();
    process.chdir(workspace);
    try {
      await buildCommand({
        output: 'build',
      });

      const customCachePath = path.join(workspace, 'build/.expressx/cache.json');
      assert.equal(fs.existsSync(customCachePath), true);
      assert.equal(fs.existsSync(path.join(workspace, 'dist/.expressx/cache.json')), false);

      const cache = JSON.parse(fs.readFileSync(customCachePath, 'utf-8'));
      assert.deepEqual(
        cache.decoratorFiles.map((file) => file.path),
        ['build/application.js'],
      );
    } finally {
      process.chdir(previousDirectory);
      fs.rmSync(workspace, {
        recursive: true,
        force: true,
      });
    }
  },
);
