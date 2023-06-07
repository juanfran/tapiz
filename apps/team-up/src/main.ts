import {
  enableProdMode,
  APP_INITIALIZER,
  importProvidersFrom,
  inject,
} from '@angular/core';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { prefersReducedMotion } from './app/app.module';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { TranslocoRootModule } from './app/transloco/transloco-root.module';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { ApiRestInterceptorModule } from './app/commons/api-rest-interceptor/api-rest-interceptor.module';
import {
  withInterceptorsFromDi,
  provideHttpClient,
} from '@angular/common/http';
import { BoardModule } from './app/modules/board/board.module';
import { configFactory, ConfigService } from './app/services/config.service';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      provideFirebaseApp(() => {
        return initializeApp(inject(ConfigService).config.firebaseConfig);
      }),
      provideAuth(() => getAuth()),
      BoardModule,
      ApiRestInterceptorModule,
      BrowserModule,
      BrowserAnimationsModule.withConfig({
        disableAnimations: prefersReducedMotion(),
      }),
      StoreRouterConnectingModule.forRoot(),
      StoreModule.forRoot(
        {},
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
      EffectsModule.forRoot([]),
      !environment.production ? StoreDevtoolsModule.instrument() : [],
      TranslocoRootModule
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: configFactory,
      multi: true,
      deps: [ConfigService],
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter([]),
  ],
}).catch((err) => console.error(err));
