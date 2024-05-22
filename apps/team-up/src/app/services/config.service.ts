import { inject, Injectable, InjectionToken } from '@angular/core';
import { Config } from '@team-up/board-commons';

export let appConfig!: Config;

export const APP_CONFIG = new InjectionToken<Config>('app.config');

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  config = inject(APP_CONFIG);

  constructor() {
    appConfig = this.config;
  }
}
