export class HttpErrorResponse {
  statusCode: number;
  error: any;
  constructor(statusCode: number, error: any) {
    this.statusCode = statusCode;
    this.error = error;
  }
}
