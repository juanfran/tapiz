import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../../../+state/app.actions';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-login-redirect',
  template: '',
  styleUrls: [],
})
export class LoginRedirectComponent implements OnInit {
  router = inject(Router);
  store = inject(Store);

  id = input.required<string>();

  ngOnInit(): void {
    const url = sessionStorage.getItem('url') ?? '/';
    sessionStorage.removeItem('url');
    this.router.navigateByUrl(url);

    this.store.dispatch(AppActions.setUserId({ userId: this.id() }));
    localStorage.setItem('userId', this.id());
  }
}
