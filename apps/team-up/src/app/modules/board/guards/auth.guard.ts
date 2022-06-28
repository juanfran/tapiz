import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Store } from '@ngrx/store';
// import { SocialAuthService } from '@abacritt/angularx-social-login';
import { map } from 'rxjs/operators';
import { selectUserId } from '../selectors/board.selectors';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private store: Store, private router: Router) {}

  public canActivate() {
    return this.store.select(selectUserId).pipe(
      map((userId) => {
        if (userId.length) {
          return true;
        }

        return this.router.parseUrl('/login');
      })
    );
  }
}
