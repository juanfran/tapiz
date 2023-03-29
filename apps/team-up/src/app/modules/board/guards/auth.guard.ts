import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import { selectUserId } from '../selectors/page.selectors';

export const AuthGuard: CanActivateFn = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectUserId).pipe(
    map((userId) => {
      if (userId.length) {
        return true;
      }

      sessionStorage.setItem('url', state.url);

      return router.parseUrl('/login');
    })
  );
};
