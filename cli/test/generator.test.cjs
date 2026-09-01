const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { Generator } = require('../dist/core/generator.js');
const { createProject } = require('../dist/utils/createProject.js');
const cliPackage = require('../package.json');

function createWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'expressx-generator-'));
  fs.writeFileSync(
    path.join(workspace, 'package.json'),
    JSON.stringify({
      name: 'generator-test',
      dependencies: { '@expressxjs/core': cliPackage.dependencies['@expressxjs/core'] },
      expressx: { sourceDir: 'src', outDir: 'dist', main: 'src/index.ts' },
    }),
  );
  return workspace;
}

function inDirectory(directory, callback) {
  const previousDirectory = process.cwd();
  process.chdir(directory);
  try {
    callback();
  } finally {
    process.chdir(previousDirectory);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('generates a correctly named controller in its conventional folder', { concurrency: false }, () => {
  const workspace = createWorkspace();
  inDirectory(workspace, () => {
    new Generator().generate('controller', 'user-profile');
    const filePath = path.join(workspace, 'src/controllers/user-profile.controller.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.match(content, /export class UserProfileController/);
    assert.match(content, /@Controller\('\/user-profiles'\)/);
    assert.match(content, /@GET\('\/'\)/);
  });
});

test('resource generation creates a wired controller, service, and DTO', { concurrency: false }, () => {
  const workspace = createWorkspace();
  inDirectory(workspace, () => {
    new Generator().generate('resource', 'Product');
    const resourcePath = path.join(workspace, 'src/modules/products');

    assert.ok(fs.existsSync(path.join(resourcePath, 'product.controller.ts')));
    assert.ok(fs.existsSync(path.join(resourcePath, 'product.service.ts')));
    assert.ok(fs.existsSync(path.join(resourcePath, 'product.dto.ts')));
    assert.match(
      fs.readFileSync(path.join(resourcePath, 'product.controller.ts'), 'utf-8'),
      /@Inject\(ProductService\)/,
    );
  });
});

test('new projects default to a complete, current full scaffold', { concurrency: false }, () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'expressx-project-'));
  inDirectory(workspace, () => {
    createProject('ultimate-app', { skipInstall: true, skipGit: true });
    const projectPath = path.join(workspace, 'ultimate-app');
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));

    assert.deepEqual(pkg.expressx, {
      sourceDir: 'src',
      outDir: 'dist',
      main: 'src/index.ts',
    });
    assert.equal(pkg.scripts.build, 'expressx build && tsc');
    assert.equal(
      pkg.dependencies['@expressxjs/core'],
      cliPackage.dependencies['@expressxjs/core'],
    );
    assert.ok(fs.existsSync(path.join(projectPath, 'src/modules/users/user.controller.ts')));
    assert.ok(fs.existsSync(path.join(projectPath, 'src/common/guards/api-key.guard.ts')));
    assert.ok(fs.existsSync(path.join(projectPath, 'src/common/exceptions/app.exception-handler.ts')));
    const bootstrap = fs.readFileSync(path.join(projectPath, 'src/index.ts'), 'utf-8');
    assert.match(bootstrap, /import \{ MyApplication \} from '\.\/application';/);
    assert.match(bootstrap, /ExpressXFactory\.createApp<MyApplication>\(\)/);
  });
});
