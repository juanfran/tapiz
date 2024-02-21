import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { Config } from '@team-up/board-commons';

export let appConfig!: Config;

export const APP_CONFIG = new InjectionToken<Config>('app.config');

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private http = inject(HttpClient);

  config = inject(APP_CONFIG);

  constructor() {
    appConfig = this.config;
  }
}
