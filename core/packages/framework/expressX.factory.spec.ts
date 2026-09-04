import { NextFn, Request, Response } from './types';
import { HttpErrorResponse } from '../http/http.error.response';
import { handleFrameworkError, handleRouteNotFound } from './expressX.factory';

describe('ExpressXFactory route fallback', () => {
  it('returns an HttpErrorResponse with status 404 for an unmatched route', async () => {
    const req = {
      method: 'GET',
      path: '/missing',
    } as Request;
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    handleRouteNotFound(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      new HttpErrorResponse(404, {
        message: 'Route not found: [GET] /missing',
      }),
    );
  });

  it('wraps an unhandled error in an HttpErrorResponse before serializing it', async () => {
    const error = new Error('Sensitive failure details');
    const req = {
      method: 'POST',
      path: '/fail',
    } as Request;
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFn;

    handleFrameworkError(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      new HttpErrorResponse(500, {
        message: 'Internal Server Error',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('preserves an HttpErrorResponse received by the fallback', async () => {
    const error = new HttpErrorResponse(403, {
      message: 'Forbidden',
    });
    const req = {
      method: 'GET',
      path: '/private',
    } as Request;
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFn;

    handleFrameworkError(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(error);
    expect(next).not.toHaveBeenCalled();
  });

  it('delegates to Express when response headers have already been sent', () => {
    const error = new Error('Streaming failed');
    const req = {
      method: 'GET',
      path: '/stream',
    } as Request;
    const res = {
      headersSent: true,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFn;

    handleFrameworkError(error, req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
