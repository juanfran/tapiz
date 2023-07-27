import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  Auth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from '@angular/fire/auth';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppActions } from '@/app/+state/app.actions';

@Component({
  selector: 'team-up-login',
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    SvgIconComponent,
    MatSnackBarModule,
  ],
})
export class LoginComponent {
  constructor(
    private auth: Auth,
    private router: Router,
    private store: Store,
    private snackBar: MatSnackBar
  ) {}

  public async loginGoogle() {
    this.login(new GoogleAuthProvider());
  }

  public loginGithub() {
    this.login(new GithubAuthProvider());
  }

  private async login(provider: GithubAuthProvider | GoogleAuthProvider) {
    try {
      const result = await signInWithPopup(this.auth, provider);

      if (this.auth.currentUser) {
        localStorage.setItem('user', JSON.stringify(result.user));

        this.store.dispatch(AppActions.setUserId({ userId: result.user.uid }));

        const nextUrl = sessionStorage.getItem('url') ?? '/';

        sessionStorage.removeItem('url');

        this.router.navigate([nextUrl]);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.snackBar.open(error.message, 'Close');
      }
    }
  }
}
