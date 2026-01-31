
import { Injectable } from '../decorators/di';
import { ExpressXApp } from '../framework/types';
import { ExpressXScanner } from '../scanner';
import express from 'express';




@Injectable()
export class Kernel {
  protected app!: ExpressXApp;
  private initialized = false;

  // constructor(
  //   @inject(ExpressXScanner) protected scanner: ExpressXScanner,
  // ) { }

  public async start(): Promise<ExpressXApp> {
    if (this.initialized) return this.app;

    // 1. Scan for controllers, configs, etc.
    await ExpressXScanner.prefurmScanning();

    console.log('═'.repeat(60));
    console.log('✅ Framework initialized successfully\n');

    // 2. validate configurations

    // 3. Create Express App
    this.app = express() as unknown as ExpressXApp;
    (this.app as any).expressXVersion = '1.0.0';

    // this.app = Object.assign(app, {
    //   expressXVersion: '1.0.0',
    //   framework: 'ExpressXjs'
    // }) as ExpressXApp;


    this.initialized = true;
    return this.app;
  }
}


