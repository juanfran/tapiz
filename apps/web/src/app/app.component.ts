import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import './app-node';
import { Store } from '@ngrx/store';

import { appFeature } from './+state/app.reducer';
import { WsService } from './modules/ws/services/ws.service';

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
  #wsService = inject(WsService);
  #store = inject(Store);

  constructor() {
    this.#store.select(appFeature.selectUserId).subscribe((userId) => {
      if (userId) {
        this.#wsService.listen();
      } else {
        this.#wsService.close();
      }
    });

    this.#authService.configureLogin();
  }
}
