
import {
  Express,
  Request as ExRequest,
  Response as ExResponse,
  NextFunction as ExNextFunction,
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

// export type ExpressXApp = Express;
export type Request = ExRequest;
export type Response = ExResponse;
export type NextFn = ExNextFunction;
