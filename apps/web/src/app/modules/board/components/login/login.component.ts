import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfigService } from '../../../../services/config.service';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'tapiz-login',
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, NgOptimizedImage],
})
export class LoginComponent {
  private configService = inject(ConfigService);

  loginGoogle() {
    window.location.href = `${this.configService.config.API_URL}/auth`;
  }
}
