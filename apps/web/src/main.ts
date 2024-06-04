import {
  enableProdMode,
  importProvidersFrom,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';

import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideStore } from '@ngrx/store';
import { provideRouterStore } from '@ngrx/router-store';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_CONFIG } from './app/services/config.service';
import { appFeature } from './app/+state/app.reducer';
import { APP_ROUTES } from './app/app.routes';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { authInterceptor } from './app/commons/api-rest-interceptor/api-rest-interceptor.service';
import { provideEffects } from '@ngrx/effects';
import * as appEffects from './app/+state/app.effects';

export function prefersReducedMotion(): boolean {
  const mediaQueryList = window.matchMedia('(prefers-reduced-motion)');

  return mediaQueryList.matches;
}

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: APP_CONFIG, useValue: environment },
    importProvidersFrom(MatSnackBarModule),
    provideAnimationsAsync(),
    provideStore(
      {
        app: appFeature.reducer,
      },
      {
        metaReducers: !environment.production ? [] : [],
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: true,
          strictActionSerializability: true,
          strictActionTypeUniqueness: true,
        },
      },
    ),
    provideEffects(appEffects),
    provideStoreDevtools({
      logOnly: !isDevMode(),
    }),
    provideRouterStore(),

    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(APP_ROUTES, withComponentInputBinding()),
    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true,
    }),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
  ],
}).catch((err) => console.error(err));
