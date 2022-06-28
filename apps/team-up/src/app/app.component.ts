import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Auth } from '@team-up/board-commons';
import { setUserId } from './modules/board/actions/board.actions';

@Component({
  selector: 'team-up-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  public title = 'team up';

  constructor(private store: Store) {
    const userStr = localStorage.getItem('user');

    if (userStr) {
      const user: Auth = JSON.parse(userStr);

      if (user['sub']) {
        this.store.dispatch(setUserId({ userId: user['sub'] }));
      }
    }
  }
}
