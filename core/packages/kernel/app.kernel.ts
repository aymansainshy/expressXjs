import { Injectable } from '../decorators/di';
import { ExpressXApp } from '../framework/types';
import { ExpressXScanner } from '../scanner';
import { logger } from '../logger/logger';
import express from 'express';

@Injectable()
export class Kernel {
  protected app!: ExpressXApp;
  private initialized = false;

  // constructor(
  //   @inject(ExpressXScanner) protected scanner: ExpressXScanner,
  // ) { }

  public async start(): Promise<ExpressXApp> {
    if (this.initialized) {
      logger.debug('Kernel already started - reusing the existing Express app', 'Kernel');
      return this.app;
    }

    const startTime = Date.now();
    logger.info('Starting kernel...', 'Kernel');

    // 1. Scan for controllers, configs, etc.
    await ExpressXScanner.prefurmScanning();

    // 2. validate configurations

    // 3. Create Express App
    this.app = express() as unknown as ExpressXApp;
    (this.app as any).expressXVersion = '1.0.0';
    logger.debug(`Express app created (ExpressX v${(this.app as any).expressXVersion})`, 'Kernel');

    // this.app = Object.assign(app, {
    //   expressXVersion: '1.0.0',
    //   framework: 'ExpressXjs'
    // }) as ExpressXApp;

    this.initialized = true;
    logger.success(`Kernel started in ${Date.now() - startTime}ms`, 'Kernel');
    return this.app;
  }
}
