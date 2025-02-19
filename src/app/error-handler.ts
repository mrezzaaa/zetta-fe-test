import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './service/auth-service/auth.service';
import { Injector, NgZone, Injectable } from '@angular/core';
import { GlobalErrorService } from './service/global-error-service/global-error-service.service';

@Injectable()
export class SwalErrorHandler {
  constructor(private translate: TranslateService, private ngZone: NgZone, private injector: Injector) {}

  // Get the authService via injector to avoid instantiate cyclic dependency error
  public get authService(): AuthService {
    // this creates authService object to refer to the service.
    return this.injector.get(AuthService);
  }

  public get globalErrorService(): GlobalErrorService {
    return this.injector.get(GlobalErrorService);
  }

  call(error: any, stackTrace: any = null, reason: any = null) {}

  public handleError(Error): void {
    console.log(Error);
    if (Error) {
      const error = String(Error);
      let exception = false;

      // Exception, dont add unless absolutely neccessary
      // temporary disable swal for route that include word "students"
      if (
        error.includes('Error retrieving icon') ||
        error.includes('ExpressionChangedAfterItHasBeenCheckedError') ||
        error.includes('confirmButton') ||
        error.includes('toElement') ||
        window.location.href.includes('students')
      ) {
        exception = true;
      }

      if (error.includes('[object Object]')) {
        const err = Error && Error.stack ? JSON.stringify(Error.stack) : error;
        this.authService.postErrorLog(err);
      }

      if (
        !error?.includes('ChunkLoadError') &&
        !error?.includes('jwt expired') &&
        !error?.includes('invalid signature') &&
        !error?.toLowerCase().includes('jwt') &&
        !error?.includes('str & salt required') &&
        !error?.includes('Authorization header is missing') &&
        !error?.includes('UnAuthenticated') &&
        !error?.includes('salt') &&
        !error?.includes('ExpressionChangedAfterItHasBeenCheckedError') &&
        !error?.includes('Password Not Valid')
      ) {
        const err = Error && Error.stack ? JSON.stringify(Error.stack) : error;
        this.authService.postErrorLog(err);
      }

      if (
        error?.includes('jwt expired') ||
        error?.toLowerCase().includes('jwt') ||
        error?.includes('invalid signature') ||
        error?.includes('str & salt required') ||
        error?.includes('Authorization header is missing') ||
        error?.includes('UnAuthenticated') ||
        error?.includes('salt') ||
        (error?.includes('salt') && !exception)
      ) {
        this.ngZone.run(() => this.authService.logOutExpireToken());
      } else if (error.includes('ChunkLoadError') && !exception) {
        location.reload();
      } else if (!exception && Error.error !== 'popup_closed_by_user') {
        // Swal.fire({
        //   type: 'error',
        //   title: 'ERROR',
        //   html: error + '<br>' + this.translate.instant('ERROR_HANDLER.Please Alert The Administration'),
        //   confirmButtonText: this.translate.instant('ERROR_HANDLER.OK'),
        //   allowOutsideClick: false,
        //   allowEnterKey: false,
        //   allowEscapeKey: false,
        // }).then(() => {
        //   this.globalErrorService.setGlobalError(true);
        // });
      } else if (Error && Error.error === 'popup_closed_by_user') {
        // This condition for google api message when user cancel auth
        Swal.fire({
          type: 'warning',
          title: 'Attention',
          html: this.translate.instant('Dialog Authentication Closed By User'),
          confirmButtonText: this.translate.instant('ERROR_HANDLER.OK'),
          allowOutsideClick: false,
          allowEnterKey: false,
          allowEscapeKey: false,
        }).then(() => {
          this.globalErrorService.setGlobalError(true);
        });
      }
    }
  }
}
