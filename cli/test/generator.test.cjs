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
      dependencies: {
        '@expressxjs/core': cliPackage.dependencies['@expressxjs/core'],
      },
      expressx: {
        sourceDir: 'src',
        outDir: 'dist',
        main: 'src/index.ts',
      },
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
    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}

test(
  'generates a correctly named controller in its conventional folder',
  {
    concurrency: false,
  },
  () => {
    const workspace = createWorkspace();
    inDirectory(workspace, () => {
      new Generator().generate('controller', 'user-profile');
      const filePath = path.join(workspace, 'src/controllers/user-profile.controller.ts');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.match(content, /export class UserProfileController/);
      assert.match(content, /@Controller\('\/user-profiles'\)/);
      assert.match(content, /@GET\('\/'\)/);
    });
  },
);

test(
  'resource generation creates a wired controller, service, and DTO',
  {
    concurrency: false,
  },
  () => {
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
  },
);

test(
  'generated middleware explicitly continues the route pipeline',
  {
    concurrency: false,
  },
  () => {
    const workspace = createWorkspace();
    inDirectory(workspace, () => {
      new Generator().generate('middleware', 'request-logger');
      const filePath = path.join(workspace, 'src/middlewares/request-logger.middleware.ts');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.match(content, /NextFn/);
      assert.match(content, /use\(ctx: HttpContext, next: NextFn\)/);
      assert.match(content, /next\(\);/);
      assert.doesNotMatch(content, /return next\(\);/);
    });
  },
);

test(
  'generated applications use the built-in body parser helpers',
  {
    concurrency: false,
  },
  () => {
    const workspace = createWorkspace();
    inDirectory(workspace, () => {
      new Generator().generate('application', 'api');
      const filePath = path.join(workspace, 'src/api.application.ts');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.match(content, /app\.useExpressJson\(\)\.useUrlencoded\(\{ extended: true \}\);/);
    });
  },
);

test(
  'rejects component names that cannot form TypeScript identifiers',
  {
    concurrency: false,
  },
  () => {
    const workspace = createWorkspace();
    inDirectory(workspace, () => {
      assert.throws(() => new Generator().generate('controller', '123'), /valid TypeScript identifier/);
    });
  },
);

test(
  'new projects default to a complete, current full scaffold',
  {
    concurrency: false,
  },
  () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'expressx-project-'));
    inDirectory(workspace, () => {
      createProject('ultimate-app', {
        skipInstall: true,
        skipGit: true,
      });
      const projectPath = path.join(workspace, 'ultimate-app');
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));

      assert.deepEqual(pkg.expressx, {
        sourceDir: 'src',
        outDir: 'dist',
        main: 'src/index.ts',
      });
      assert.equal(pkg.scripts.build, 'expressx build && tsc');
      assert.equal(pkg.dependencies['@expressxjs/core'], cliPackage.dependencies['@expressxjs/core']);
      assert.ok(fs.existsSync(path.join(projectPath, 'src/modules/users/user.controller.ts')));
      assert.equal(fs.existsSync(path.join(projectPath, 'src/common/guards/api-key.guard.ts')), false);
      assert.ok(fs.existsSync(path.join(projectPath, 'src/common/exceptions/app.exception-handler.ts')));
      const bootstrap = fs.readFileSync(path.join(projectPath, 'src/index.ts'), 'utf-8');
      assert.match(bootstrap, /import \{ MyApplication \} from '\.\/application';/);
      assert.match(bootstrap, /ExpressXFactory\.createApp<MyApplication>\(\)/);
      const application = fs.readFileSync(path.join(projectPath, 'src/application.ts'), 'utf-8');
      assert.match(application, /app\.useExpressJson\(\)\.useUrlencoded\(\{ extended: true \}\);/);
      assert.doesNotMatch(application, /import express from 'express'/);
      const controller = fs.readFileSync(path.join(projectPath, 'src/modules/users/user.controller.ts'), 'utf-8');
      assert.doesNotMatch(controller, /ApiKeyGuard|UseGuards/);
      const middleware = fs.readFileSync(
        path.join(projectPath, 'src/common/middlewares/request-logger.middleware.ts'),
        'utf-8',
      );
      assert.match(middleware, /use\(ctx: HttpContext, next: NextFn\)/);
      assert.match(middleware, /next\(\);/);
      assert.doesNotMatch(middleware, /return next\(\);/);
    });
  },
);
