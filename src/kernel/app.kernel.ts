
import express, { Express } from 'express';
import { inject, injectable } from 'tsyringe';
import { Scanner } from '../scanner';



@injectable()
export class Kernel {
  protected app!: Express;
  private initialized = false;

  constructor(
    @inject(Scanner) protected scanner: Scanner,
  ) { }

  public async start(): Promise<Express> {
    if (this.initialized) return this.app;

    // 1. Scan for controllers, configs, etc.
    await this.scanner.scanProject();

    // 2. validate configurations

    // 3. Create Express App
    const app = express();
    this.app = app;

    this.initialized = true;
    return this.app;
  }
}


