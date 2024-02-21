import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../../../+state/app.actions';

@Component({
  selector: 'team-up-login-redirect',
  template: '',
  styleUrls: [],
})
export class LoginRedirectComponent implements OnInit {
  router = inject(Router);
  store = inject(Store);

  @Input() id!: string;

  ngOnInit(): void {
    const url = sessionStorage.getItem('url') ?? '/';
    sessionStorage.removeItem('url');
    this.router.navigate([url]);

    this.store.dispatch(AppActions.setUserId({ userId: this.id }));
    localStorage.setItem('userId', this.id);
  }
}
