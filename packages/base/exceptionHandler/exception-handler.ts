import { HttpErrorResponse } from "../../http/http.error.response";


export abstract class ExceptionHandler {
  abstract catch(error: any): Promise<HttpErrorResponse> | Promise<any> | HttpErrorResponse | any;
}

