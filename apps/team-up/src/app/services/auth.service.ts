import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { PageActions } from '../modules/board/actions/page.actions';
import { User } from '@team-up/board-commons';
import { User as FirebaseUser } from 'firebase/auth';
import { BehaviorSubject, filter, take } from 'rxjs';
import { selectUserId } from '../modules/board/selectors/page.selectors';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private store = inject(Store);
  private auth = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authReady$ = new BehaviorSubject<boolean>(false);

  public get authReady() {
    return this.authReady$.asObservable();
  }

  public getUser() {
    return this.http.get<User>(`http://localhost:8000/user`);
  }

  public initAuth() {
    const userStr = localStorage.getItem('user');

    if (userStr) {
      const user: FirebaseUser = JSON.parse(userStr);

      if (user['uid']) {
        this.store.dispatch(PageActions.setUserId({ userId: user['uid'] }));
      } else {
        this.router.navigate(['/login']);
      }
    } else {
      this.authReady$.next(true);
    }

    this.store
      .select(selectUserId)
      .pipe(
        filter((userId) => userId.length > 0),
        take(1)
      )
      .subscribe(() => {
        onAuthStateChanged(this.auth, async (user) => {
          if (user) {
            this.refreshToken();

            setInterval(async () => {
              this.refreshToken(true);
            }, 55 * 60 * 1000);
          } else {
            this.logout();
          }
        });
      });
  }

  public logout() {
    this.auth.signOut();
    document.cookie = '';
    localStorage.removeItem('user');
    this.store.dispatch(PageActions.setUserId({ userId: '' }));
    this.router.navigate(['/login']);
  }

  private async refreshToken(forceRefresh = false) {
    if (this.auth.currentUser) {
      const idToken = await this.auth.currentUser.getIdToken(forceRefresh);
      document.cookie = `auth=${idToken};path=/`;

      this.authReady$.next(true);
    }
  }
}
