import { HttpErrorResponse } from '../../http/http.error.response';

export abstract class ExceptionHandler {
  abstract catch(error: unknown): HttpErrorResponse | Promise<HttpErrorResponse>;
}
