import { AuthService } from '@/app/services/auth.service';
import { ConfigService } from '@/app/services/config.service';
import { GoogleAuthService } from '@/app/services/googleAuth.service';
import {
  Component,
  ChangeDetectionStrategy,
  AfterViewInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { PageActions } from '../../actions/page.actions';

@Component({
  selector: 'team-up-login',
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements AfterViewInit {
  constructor(
    private authService: AuthService,
    private googleAuthService: GoogleAuthService,
    private router: Router,
    private store: Store,
    private configService: ConfigService
  ) {}
  public clientId = this.configService.config.GOOGLE_CLIENT_ID;

  public ngAfterViewInit() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onSignIn = (googleUser: any) => {
      document.cookie = `auth=${googleUser.credential}`;
      localStorage.setItem('auth', googleUser.credential);

      this.authService.getUser().subscribe((user) => {
        localStorage.setItem('user', JSON.stringify(user));

        this.store.dispatch(PageActions.setUserId({ userId: user.sub }));

        const nextUrl = sessionStorage.getItem('url') ?? '/';

        sessionStorage.removeItem('url');

        this.router.navigate([nextUrl]);
      });
    };

    this.googleAuthService.init();
  }
}
