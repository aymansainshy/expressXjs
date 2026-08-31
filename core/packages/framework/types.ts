
import {
  Express,
  Request,
  Response,
  NextFunction as NextFn,
} from 'express';

export interface ExpressXApp extends Express {
  readonly framework: 'ExpressXjs';
  readonly expressXVersion: string;
}

// export interface Request extends ExRequest {
//   xTrackId?: string;
// }

// export interface Response extends ExResponse {
//   sendSuccess: (data: any) => void;
// }

export interface HttpContext {
  req: Request;
  res: Response;
}

export { Request, Response, NextFn };



