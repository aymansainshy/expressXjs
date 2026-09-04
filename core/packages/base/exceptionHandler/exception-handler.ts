import { HttpErrorResponse } from '../../http/http.error.response';

export abstract class ExceptionHandler {
  abstract catch(error: any): HttpErrorResponse | Promise<HttpErrorResponse>;
}
