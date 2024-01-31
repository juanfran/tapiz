import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';
import './app-node';

@Component({
  selector: 'team-up-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterOutlet],
})
export class AppComponent {
  public title = 'team up';

  constructor(private authService: AuthService) {
    this.authService.configureLogin();
  }
}
