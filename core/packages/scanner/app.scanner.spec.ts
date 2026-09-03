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
    ['js', 'development', false],
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

      await ExpressXScanner.prefurmScanning();

      expect(loadCache).toHaveBeenCalledWith(expectedTypeScriptMode);
    },
  );
});

function setEnvironmentVariable(name: 'EXPRESSX_RUNTIME' | 'NODE_ENV', value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
