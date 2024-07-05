import { inject } from '@angular/core';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { WsService } from '../../modules/ws/services/ws.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const configService = inject(ConfigService);
  const router = inject(Router);
  const wsService = inject(WsService);

  // update api-config.service.ts
  if (
    configService.config &&
    (req.url.includes(configService.config.API_URL) ||
      req.url.includes(configService.config.WS_URL))
  ) {
    let request = req.clone({
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'correlation-id': wsService.correlationId,
      }),
      withCredentials: true,
    });

    if (req.url.includes('upload-file-board')) {
      request = req.clone({
        headers: new HttpHeaders({
          'correlation-id': wsService.correlationId,
        }),
        withCredentials: true,
      });
    }

    return next(request).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          void router.navigate(['/login']);
        }

        return throwError(() => err);
      }),
    );
  }

  return next(req);
};
