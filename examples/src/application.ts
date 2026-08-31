
import { Application, ExpressXApp, OnInitExpressXApp } from '@expressx/core';
import { ExpressX, ExpressXFactory } from '@expressx/core';
import { createServer } from 'http';
import { parseArgs } from 'util';


@Application()
export class MyApplication extends ExpressX {

  public async preInit(): Promise<void> {
    console.log("Pre-initialization logic here.");
    return Promise.resolve();
  }

  public async onInit(app: OnInitExpressXApp): Promise<void> {
    app.use((req: any, res: any, next: any) => {
      console.log(`Initialization [${req.method}] ${req.path}`);
      next();
    });
  }

  public postInit(app: any): void {
    console.log("Post-initialization logic here.");
    console.log("Setting up routes...");
  }


  public async bootstrap(): Promise<void> {
    const { values } = parseArgs({
      options: {
        port: {
          type: 'string',
          short: 'p',
        },
      },
      strict: false, // Allow other flags
    });
    const port = values.port || 3000;
    const app: ExpressXApp = await ExpressXFactory.createApp<MyApplication>();
    // app.use((req: any, res: any, next: any) => {
    //   console.log(`Request: [${req.method}] ${req.path}`);
    //   next();
    // });
    const server = createServer(app);
    server.listen(port, () => {
      console.log(`[ExpressX] Server running on http://localhost:${port}`);
    });
  }
}


