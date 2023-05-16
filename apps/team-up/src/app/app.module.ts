import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { HttpClientModule } from '@angular/common/http';
import { ApiRestInterceptorModule } from './commons/api-rest-interceptor/api-rest-interceptor.module';

import { BoardModule } from './modules/board/board.module';

import { TranslocoRootModule } from './transloco/transloco-root.module';
import { ConfigService, configFactory } from './services/config.service';
import { RouterModule } from '@angular/router';

document.oncontextmenu = () => {
  return false;
};

export function prefersReducedMotion(): boolean {
  const mediaQueryList = window.matchMedia('(prefers-reduced-motion)');

  return mediaQueryList.matches;
}
