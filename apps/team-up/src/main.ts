import {
  enableProdMode,
  APP_INITIALIZER,
  importProvidersFrom,
  inject,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideStore } from '@ngrx/store';
import { provideRouterStore } from '@ngrx/router-store';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { configFactory, ConfigService } from './app/services/config.service';
import { appFeature } from './app/+state/app.reducer';
import { APP_ROUTES } from './app/app.routes';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { authInterceptor } from './app/commons/api-rest-interceptor/api-rest-interceptor.service';

if (environment.production) {
  enableProdMode();
}

export function prefersReducedMotion(): boolean {
  const mediaQueryList = window.matchMedia('(prefers-reduced-motion)');

  return mediaQueryList.matches;
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      provideFirebaseApp(() => {
        return initializeApp(inject(ConfigService).config.firebaseConfig);
      }),
      provideAuth(() => getAuth()),
      MatSnackBarModule
    ),
    prefersReducedMotion() ? provideAnimationsAsync() : provideNoopAnimations(),
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
      }
    ),
    provideStoreDevtools({
      logOnly: !isDevMode(),
    }),
    provideRouterStore(),
    {
      provide: APP_INITIALIZER,
      useFactory: configFactory,
      multi: true,
      deps: [ConfigService],
    },
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
