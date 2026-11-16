import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfigService } from '../../../../services/config.service';
import { NgOptimizedImage } from '@angular/common';

export interface AuthProviders {
  google: boolean;
  oidc: boolean;
  oidcLabel: string;
}

@Component({
  selector: 'tapiz-login',
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, NgOptimizedImage],
})
export class LoginComponent implements OnInit {
  private configService = inject(ConfigService);

  providers = signal<AuthProviders | null>(null);
  providersError = signal(false);

  async ngOnInit() {
    try {
      const response = await fetch(
        `${this.configService.config.API_URL}/auth/providers`,
      );
      if (!response.ok) throw new Error('Provider discovery failed');
      this.providers.set((await response.json()) as AuthProviders);
    } catch {
      this.providersError.set(true);
    }
  }

  loginGoogle() {
    window.location.href = `${this.configService.config.API_URL}/auth`;
  }

  loginOidc() {
    window.location.href = `${this.configService.config.API_URL}/auth/oidc`;
  }
}
