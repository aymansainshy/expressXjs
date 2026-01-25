
import express, { Express } from 'express';
import { inject, injectable } from 'tsyringe';
import { ExpressXScanner } from '../scanner';



@injectable()
export class Kernel {
  protected app!: Express;
  private initialized = false;

  // constructor(
  //   @inject(ExpressXScanner) protected scanner: ExpressXScanner,
  // ) { }

  public async start(): Promise<Express> {
    if (this.initialized) return this.app;

    // 1. Scan for controllers, configs, etc.
    await ExpressXScanner.prefurmScanning();

    console.log('═'.repeat(60));
    console.log('✅ Framework initialized successfully\n');

    // 2. validate configurations

    // 3. Create Express App
    const app = express();
    this.app = app;

    this.initialized = true;
    return this.app;
  }
}


