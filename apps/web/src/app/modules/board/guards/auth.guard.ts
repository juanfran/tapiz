import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { filter, map, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../services/auth.service';
import { appFeature } from '../../../+state/app.reducer';

export const AuthGuard: CanActivateFn = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const store = inject(Store);
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.authReady.pipe(
    filter((ready) => ready),
    switchMap(() => {
      return store.select(appFeature.selectUserId).pipe(
        map((userId) => {
          if (userId.length) {
            return true;
          }

          sessionStorage.setItem('url', state.url);

          return router.parseUrl('/login');
        }),
      );
    }),
  );
};
