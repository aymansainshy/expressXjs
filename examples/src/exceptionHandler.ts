import { ExceptionHandler, HttpErrorResponse, UseGlobalExceptionHandler } from '@expressxjs/core';

@UseGlobalExceptionHandler()
class AppExceptionHandler extends ExceptionHandler {
  catch(error: unknown): HttpErrorResponse {
    // return new HttpErrorResponse(400, {
    //   message: error instanceof Error ? error.message : 'An error occurred',
    //   details: error instanceof Error ? error?.stack : 'No stack trace available',
    // });

    return new HttpErrorResponse().status(400).errorBody({
      message: error instanceof Error ? error.message : 'An error occurred',
      details: error instanceof Error ? error?.stack : 'No stack trace available',
    });
  }
}
