import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../../../+state/app.actions';
import { UserApiService } from '../../../../services/user-api.service';
@Component({
  selector: 'tapiz-login-redirect',
  template: '',
  styleUrls: [],
})
export class LoginRedirectComponent implements OnInit {
  router = inject(Router);
  store = inject(Store);
  userApiService = inject(UserApiService);

  ngOnInit(): void {
    this.userApiService.user().subscribe((user) => {
      this.store.dispatch(AppActions.setUser({ user }));
      localStorage.setItem('user', JSON.stringify(user));

      const url = sessionStorage.getItem('url') ?? '/';
      sessionStorage.removeItem('url');
      this.router.navigateByUrl(url);
    });
  }
}
