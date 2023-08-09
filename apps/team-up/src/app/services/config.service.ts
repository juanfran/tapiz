import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Config } from '@team-up/board-commons';
import { catchError, map, Observable, of, zip } from 'rxjs';
import { environment } from '../../environments/environment';
import { FirebaseOptions } from 'firebase/app';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '@team-up/api/app';

export const configFactory = (
  config: ConfigService
): (() => Observable<boolean>) => {
  return () => config.loadAppConfig();
};

export let appConfig!: Config;

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  constructor(private http: HttpClient) {}

  config!: Config;

  public loadAppConfig(): Observable<boolean> {
    return zip(
      this.http.get<Config>(environment.config),
      this.http.get<FirebaseOptions>(environment.firebase)
    ).pipe(
      map(([mainConfig, firebase]) => {
        this.config = {
          ...mainConfig,
          firebaseConfig: firebase,
        };

        appConfig = this.config;
        return true;
      }),
      catchError(() => {
        console.error('Error loading config');
        return of(false);
      })
    );
  }

  public getTrpcConfig() {
    return createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: appConfig.API + '/trpc',
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
    });
  }
}
