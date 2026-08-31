
// class User {
//   username: string;
//   password: string;
//   constructor(username: string, password: string) {
//     this.username = username;
//     this.password = password
//   }
// }


// @injectable()
// export class UserService {
//   public async getUserList(): Promise<User[]> {
//     return [new User("ayman", "password")];
//   }
// }


// @Controller('/users')
// export class UserController {
//   constructor(
//     @inject(UserService) private userService: UserService,
//   ) { }

//   @GET('/')
//   @UserGuard(JwtAuthGuard)
//   @UseInterceptors(TimingInterceptor)
//   @UseMiddlewares(LoggerMiddleware)
//   public async getUsers(@Req() req: Request, @Body() body: any): Promise<HttpResponse> {
//     const userList: User[] = await this.userService.getUserList();
//     return HttpResponse.ok(userList);
//   }
// }


// @Application()
// export class MyApplication extends ExpressX {
//   constructor(
//     @inject(DataSource) private dataSource: DataSource,
//     @inject(RedisClient) private redisClient: RedisClient,
//   ) { }

//   public preInit(): Promise<void> {
//     await Promise.all([
//       this.dataSource.connec(),
//       this.redisClient.connect()
//     ])
//     return Promise.resolve();
//   }

//   public onInit(app: Express): void {
//     app.use(helmet());
//     app.use(cors());
//     app.use(express.json());
//   }

//   public postInit(app: Express): void {
//     console.log("Post-initialization logic here.");
//     const routes = app._router.stack
//       .filter((r: any) => r.route)
//       .map((r: any) => r.route.path);
//     console.log(`[ExpressX] ✅ Setup complete. ${routes.length} routes registered.`);
//   }

//   public async bootstrap(): Promise<void> {
//     const port = 3000;
//     const app: Express = await ExpressXFactory.createApp<MyApplication>();
//     const server = createServer(app);
//     server.listen(port, () => {
//       console.log(`[ExpressX] Server running on http://localhost:${port}`);
//     });
//   }
// }



// const myApp: MyApplication = container.resolve<MyApplication>(MyApplication);

// myApp.bootstrap().catch(err => {
//   console.error('Error starting server:', err);
// });