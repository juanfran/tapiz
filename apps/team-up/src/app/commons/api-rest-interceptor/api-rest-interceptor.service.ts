import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ConfigService } from '@/app/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class ApiRestInterceptorService implements HttpInterceptor {
  constructor(private router: Router, private configService: ConfigService) {}

  public intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (
      this.configService.config &&
      (req.url.includes(this.configService.config.API) ||
        req.url.includes(this.configService.config.WS))
    ) {
      const request = req.clone({
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
        withCredentials: true,
      });

      return next.handle(request).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) {
            void this.router.navigate(['/login']);
          }

          return throwError(() => err);
        })
      );
    }

    return next.handle(req);
  }
}
