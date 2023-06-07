import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { PageActions } from './modules/board/actions/page.actions';
import { RouterOutlet } from '@angular/router';
import { User } from 'firebase/auth';

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

  constructor(private store: Store) {
    const userStr = localStorage.getItem('user');

    if (userStr) {
      const user: User = JSON.parse(userStr);

      if (user['uid']) {
        this.store.dispatch(PageActions.setUserId({ userId: user['uid'] }));
      }
    }
  }
}
