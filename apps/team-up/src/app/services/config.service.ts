import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Config } from '@team-up/board-commons';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export const configFactory = (
  config: ConfigService
): (() => Observable<boolean>) => {
  return () => config.loadAppConfig();
};

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  constructor(private http: HttpClient) {}

  config!: Config;

  public loadAppConfig(): Observable<boolean> {
    return this.http.get<Config>(environment.config).pipe(
      map((response) => {
        this.config = response;
        return true;
      }),
      catchError(() => {
        this.config = {
          API: 'http://localhost:3000',
          WS: 'ws://localhost:3000',
          GOOGLE_CLIENT_ID: '',
        };

        return of(false);
      })
    );
  }
}
