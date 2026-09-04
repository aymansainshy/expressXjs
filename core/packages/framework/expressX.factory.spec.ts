import { NextFn, Request, Response } from './types';
import { HttpErrorResponse } from '../http/http.error.response';
import { HttpResponseHandler } from '../http/response.handler';
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
    const next = jest.fn() as NextFn;
    const responseHandler = jest.spyOn(HttpResponseHandler, 'handlerResponse');

    await handleRouteNotFound(req, res, next);

    expect(responseHandler).toHaveBeenCalledWith(expect.any(Function), res, next);
    const responseFactory = responseHandler.mock.calls[0][0];
    await expect(responseFactory()).resolves.toEqual(
      new HttpErrorResponse(404, {
        message: 'Route not found: [GET] /missing',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Route not found: [GET] /missing',
    });
    expect(next).not.toHaveBeenCalled();

    responseHandler.mockRestore();
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
    const responseHandler = jest.spyOn(HttpResponseHandler, 'handlerResponse');

    await handleFrameworkError(error, req, res, next);

    expect(responseHandler).toHaveBeenCalledWith(expect.any(Function), res, next);
    const responseFactory = responseHandler.mock.calls[0][0];
    await expect(responseFactory()).resolves.toEqual(
      new HttpErrorResponse(500, {
        message: 'Internal Server Error',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal Server Error',
    });
    expect(next).not.toHaveBeenCalled();

    responseHandler.mockRestore();
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

    await handleFrameworkError(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
