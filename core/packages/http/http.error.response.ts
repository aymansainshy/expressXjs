export class HttpErrorResponse<T = any> {
  constructor(
    public statusCode: number = 500,
    public error?: T,
  ) {}

  status(statusCode: number): this {
    this.statusCode = statusCode;
    return this;
  }

  errorBody(error: T): this {
    this.error = error;
    return this;
  }
}
