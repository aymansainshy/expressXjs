
export class HttpResponse<T = any> {
  constructor(
    public code: number = 200,
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

  // static redirect(url: string) {
  //   const response = new HttpResponse<void>(302);
  //   (response as any).redirectUrl = url; // Attach redirect URL for handling in the response handler
  //   return response;
  // }


  status(code: number): this {
    this.code = code;
    return this;
  }

  body(data: T): this {
    this.data = data;
    return this;
  }
}