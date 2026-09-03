import {
  Body,
  Controller,
  Ctx,
  GET,
  HttpContext,
  Inject,
  Injectable,
  Next,
  NextFn,
  POST,
  StatusCode,
  UseGuards,
  UseInterceptors,
  UseMiddlewares,
} from '@expressxjs/core';
import { HttpResponse } from '@expressxjs/core';
import { ResponseEnvelopeInterceptor } from './interceptors';
import { JWTAuthGuard } from './auth.guard';
import { LoggerMiddleware } from './middlewares';

class User {
  username: string;
  password: string;
  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }
}

@Injectable()
export class UserService {
  userList: User[] = [new User('ayman', 'password')];

  public async createUser(username: string, password: string): Promise<User> {
    const newUser = new User(username, password);
    this.userList.push(newUser);
    return newUser;
  }

  public async getUserLis(): Promise<User[]> {
    return this.userList;
  }
}

@Injectable()
export class LogService {
  public async getLogs(): Promise<string> {
    return 'Logs retrieved successfully';
  }
}

@Controller('/users')
export class UserController {
  constructor(
    @Inject(UserService)
    private userService: UserService,
  ) {}

  @GET('/')
  @UseGuards(JWTAuthGuard)
  @UseMiddlewares(LoggerMiddleware)
  @UseInterceptors(ResponseEnvelopeInterceptor)
  @StatusCode(200)
  public async getUsers(
    @Ctx()
    ctx: HttpContext,
    @Body()
    body: any,
    @Next()
    next: NextFn,
  ): Promise<HttpResponse | any> {
    try {
      console.log('Handler Executed', ctx.req.body);
      // throw new Error("This is a test error to demonstrate global exception handling");
      const userList: User[] = await this.userService.getUserLis();
      console.log(userList);
      return HttpResponse.ok(userList); // new HttpResponse().status(345).body(userList);
      // return { message: "Users retrieved successfully", data: userList }; // @StatusCode(200)
      // response.status(200).json({ message: "Users retrieved successfully", data: userList });
    } catch (error) {
      // next(error);
      // This will be caught by the global exception handler
      throw error;
    }
  }

  @POST('/')
  public async createUser(
    @Body()
    body: any,
  ): Promise<HttpResponse | any> {
    console.log('Create User Handler Executed', body);
    const user = await this.userService.createUser(body.username, body.password);
    console.log('Created User:', user);
    return HttpResponse.created(user);
  }
}
