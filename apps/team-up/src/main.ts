import {
  enableProdMode,
  APP_INITIALIZER,
  importProvidersFrom,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { TranslocoRootModule } from './app/transloco/transloco-root.module';
import {
  StoreDevtoolsModule,
  provideStoreDevtools,
} from '@ngrx/store-devtools';
import { provideStore } from '@ngrx/store';
import { provideRouterStore } from '@ngrx/router-store';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { ApiRestInterceptorModule } from './app/commons/api-rest-interceptor/api-rest-interceptor.module';
import {
  withInterceptorsFromDi,
  provideHttpClient,
} from '@angular/common/http';
import { AppModule } from './app/app.module';
import { configFactory, ConfigService } from './app/services/config.service';
import { appFeature } from './app/+state/app.reducer';

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
      AppModule,
      ApiRestInterceptorModule,
      BrowserModule,
      BrowserAnimationsModule.withConfig({
        disableAnimations: prefersReducedMotion(),
      }),
      !environment.production ? StoreDevtoolsModule.instrument() : [],
      TranslocoRootModule
    ),
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
    !environment.production ? provideStoreDevtools() : [],
    provideRouterStore(),
    {
      provide: APP_INITIALIZER,
      useFactory: configFactory,
      multi: true,
      deps: [ConfigService],
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter([]),
    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true,
    }),
  ],
}).catch((err) => console.error(err));
