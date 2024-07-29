import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../../../+state/app.actions';
import { UserApiService } from '../../../../services/user-api.service';
import { AuthService } from '../../../../services/auth.service';
@Component({
  selector: 'tapiz-login-redirect',
  template: '',
  styleUrls: [],
})
export class LoginRedirectComponent implements OnInit {
  router = inject(Router);
  store = inject(Store);
  userApiService = inject(UserApiService);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.userApiService.user().subscribe((user) => {
      this.store.dispatch(AppActions.setUser({ user }));
      this.authService.setLocalStoreUser(user);

      const url = sessionStorage.getItem('url') ?? '/';
      sessionStorage.removeItem('url');
      this.router.navigateByUrl(url);
    });
  }
}
