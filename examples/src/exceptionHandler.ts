import { UseGlobalExceptionHandler } from '@expressxjs/core';
import { ExceptionHandler } from '@expressxjs/core';
import { HttpErrorResponse } from '../../core/dist/http/http.error.response';

@UseGlobalExceptionHandler()
class AppExceptionHandler extends ExceptionHandler {
  catch(error: any) {
    console.error(error instanceof Error);

    return new HttpErrorResponse(400, {
      message: error instanceof Error ? error.message : 'An error occurred',
      details: error?.stack || 'No stack trace available',
    });
  }
}
