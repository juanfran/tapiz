import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'team-up-login',
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatButtonModule, MatIconModule, SvgIconComponent],
})
export class LoginComponent {
  constructor(private authService: AuthService) {}

  loginGoogle() {
    this.authService.loginGoogle();
  }
}
