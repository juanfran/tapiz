import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Config } from '@team-up/board-commons';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export const configFactory = (
  config: ConfigService,
): (() => Observable<boolean>) => {
  return () => config.loadAppConfig();
};

export let appConfig!: Config;

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private http = inject(HttpClient);

  config!: Config;

  public loadAppConfig(): Observable<boolean> {
    return this.http.get<Config>(environment.config).pipe(
      map((mainConfig) => {
        this.config = mainConfig;

        appConfig = this.config;
        return true;
      }),
      catchError(() => {
        console.error('Error loading config');
        return of(false);
      }),
    );
  }
}
