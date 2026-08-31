import { UseGlobalExceptionHandler } from "@expressxjs/core";
import { ExceptionHandler } from "@expressxjs/core";
import { HttpErrorResponse } from "../../core/dist/http/http.error.response";


@UseGlobalExceptionHandler()
class AppExceptionHandler extends ExceptionHandler {
  catch(error: any) {
    // Implementation for handling exceptions
    return new HttpErrorResponse(400, { message: 'An error occurred', details: error instanceof Error ? error.message : error });
  }
}
