import { Component, inject } from '@angular/core';
import { UserApiService } from '../../../../services/user-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

@Component({
  selector: 'team-up-login-redirect',
  template: '',
  styleUrls: [],
})
export class LoginRedirectComponent {
  userApiService = inject(UserApiService);
  router = inject(Router);

  constructor() {
    this.userApiService
      .login()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const url = sessionStorage.getItem('url') ?? '/';
        sessionStorage.removeItem('url');

        this.router.navigate([url]);
      });
  }
}
