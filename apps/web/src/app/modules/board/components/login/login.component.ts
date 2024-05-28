import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'tapiz-login',
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatButtonModule, MatIconModule, SvgIconComponent],
})
export class LoginComponent {
  private configService = inject(ConfigService);

  loginGoogle() {
    window.location.href = `${this.configService.config.API_URL}/auth`;
  }
}
