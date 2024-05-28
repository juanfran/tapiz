import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import './app-node';
import { SubscriptionService } from './services/subscription.service';
import { Store } from '@ngrx/store';

import { appFeature } from './+state/app.reducer';

@Component({
  selector: 'tapiz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterOutlet],
})
export class AppComponent {
  #authService = inject(AuthService);
  #subscriptionService = inject(SubscriptionService);
  #store = inject(Store);

  constructor() {
    this.#store.select(appFeature.selectUserId).subscribe((userId) => {
      if (userId) {
        this.#subscriptionService.listen();
      } else {
        this.#subscriptionService.close();
      }
    });

    this.#authService.configureLogin();
  }
}
