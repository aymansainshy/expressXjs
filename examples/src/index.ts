
import { MyApplication } from "./application";
import { ExpressXContainer } from '@expressxjs/core';
import { APP_TOKEN } from "@expressxjs/core";
import { ExpressX, ExpressXLogger } from "@expressxjs/core";

// import { ExpressXFactory } from "@expressxjs/core";
// import { createServer } from "http";

const logger = new ExpressXLogger();


const application: MyApplication = ExpressXContainer.resolve<MyApplication>(MyApplication)

// const expressXapplicaion: ExpressX = ExpressXContainer.resolve<ExpressX>(APP_TOKEN);

// logger.warn("Long text for testing the application instance equality and logging Long text for testing the application instance equality and logging Long text for testing the application instance equality and logging ", `${application === expressXapplicaion}`);


application.bootstrap().catch(err => {
  console.error('Error during bootstrap:', err);
  // logger.error(err.message, 'bootStrap', err.stack);
});



// async function bootstrap(): Promise<void> {
//   const port = 3000;
//   const app: any = await ExpressXFactory.createApp();
//   const server = createServer(app);
//   server.listen(port, () => {
//     console.log(`[ExpressX] Server running on http://localhost:${port}`);
//   });
// }



// bootstrap().catch(err => {
//   console.error('Error starting server:', err);
// });