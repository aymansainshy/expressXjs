
import { Request, Response, NextFunction } from "express";
import { HttpResponse } from "./http.response";



export class HttpResponseHandler {
  static async handler(
    fn: () => Promise<HttpResponse>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await fn();

      // Controller/interceptor handled response manually
      if (!result || res.headersSent) return;

      // No content
      if (result.statusCode === 204) {
        res.status(204).end();
        return;
      }

      res.status(result.statusCode ?? 200).json(result.data);
    } catch (err: any) {
      next(err);
    }
  }
}
