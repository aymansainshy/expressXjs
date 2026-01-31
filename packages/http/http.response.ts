
export class HttpResponse<T = any> {
  constructor(
    public statusCode: number = 200,
    public data?: T
  ) { }

  static ok<T>(data: T) {
    return new HttpResponse<T>(200, data);
  }

  static created<T>(data: T) {
    return new HttpResponse<T>(201, data);
  }

  static noContent() {
    return new HttpResponse<void>(204);
  }


  status(statusCode: number): this {
    this.statusCode = statusCode;
    return this;
  }

  body(data: T): this {
    this.data = data;
    return this;
  }
}