import { HttpClient } from '@angular/common/http';
import { Injectable, inject, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs';
import { AppActions } from '../+state/app.actions';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private store = inject(Store);
  private oauthService = inject(OAuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authReady$ = new BehaviorSubject<boolean>(false);
  private configService = inject(ConfigService);

  public configureLogin() {
    const authCodeFlowConfig: AuthConfig = {
      issuer: 'https://accounts.google.com',
      redirectUri: window.location.origin + '/login-redirect',
      clientId: this.configService.config.GOOGLE_CLIENT_ID,
      scope: 'openid profile email',
      strictDiscoveryDocumentValidation: !isDevMode(),
      clearHashAfterLogin: !isDevMode(),
      showDebugInformation: false,
    };

    this.oauthService.events.subscribe((event) => {
      if (event.type === 'token_received' || event.type === 'token_refreshed') {
        document.cookie = `auth=${this.oauthService.getIdToken()}; path=/`;
      }
    });

    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.setupAutomaticSilentRefresh();

    this.initAuth();
  }

  public get authReady() {
    return this.authReady$.asObservable();
  }

  public async loginGoogle() {
    this.oauthService.initLoginFlow();
  }

  private initAuth() {
    this.oauthService.loadDiscoveryDocumentAndTryLogin().then(() => {
      const identity = this.oauthService.getIdentityClaims();

      if (!identity) {
        this.logout();
        return;
      }

      this.store.dispatch(AppActions.setUserId({ userId: identity['sub'] }));
      this.authReady$.next(true);
    });
  }

  public logout() {
    this.oauthService.logOut();
    document.cookie = '';
    localStorage.removeItem('user');
    this.store.dispatch(AppActions.setUserId({ userId: '' }));
    this.router.navigate(['/login']);
  }
}
