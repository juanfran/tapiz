import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, take } from 'rxjs';
import { AppActions } from '../+state/app.actions';
import { filterNil } from 'ngxtension/filter-nil';
import { appFeature } from '../+state/app.reducer';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private store = inject(Store);
  private authReady$ = new BehaviorSubject<boolean>(false);

  public configureLogin() {
    const userId = localStorage.getItem('userId');

    if (userId) {
      this.store.dispatch(AppActions.setUserId({ userId }));

      this.store
        .select(appFeature.selectUserId)
        .pipe(filterNil(), take(1))
        .subscribe(() => {
          this.authReady$.next(true);
        });
    } else {
      this.authReady$.next(true);
    }
  }

  public get authReady() {
    return this.authReady$.asObservable();
  }

  public logout() {
    this.store.dispatch(AppActions.logout());
  }
}
