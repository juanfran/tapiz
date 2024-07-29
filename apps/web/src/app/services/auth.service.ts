import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, take } from 'rxjs';
import { AppActions } from '../+state/app.actions';
import { filterNil } from 'ngxtension/filter-nil';
import { appFeature } from '../+state/app.reducer';
import { AuthUserModel } from '@tapiz/board-commons';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private store = inject(Store);
  private authReady$ = new BehaviorSubject<boolean>(false);

  configureLogin() {
    const user = localStorage.getItem('user');

    if (user) {
      this.store.dispatch(AppActions.setUser({ user: JSON.parse(user) }));

      this.store
        .select(appFeature.selectUser)
        .pipe(filterNil(), take(1))
        .subscribe(() => {
          this.authReady$.next(true);
        });
    } else {
      this.authReady$.next(true);
    }
  }

  get authReady() {
    return this.authReady$.asObservable();
  }

  logout() {
    this.store.dispatch(AppActions.logout());
  }

  setLocalStoreUser(user: AuthUserModel) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  removeLocalStoreUser() {
    localStorage.removeItem('user');
  }
}
