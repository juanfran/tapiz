import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { pageFeature } from '../../modules/board/reducers/page.reducer';
import { boardFeature } from '../../modules/board/reducers/board.reducer';
import { map, switchMap } from 'rxjs';
import { filterNil } from '../../commons/operators/filter-nil';
import { PageActions } from '../../modules/board/actions/page.actions';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'team-up-follow-user',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="wrapper">
      <button
        *ngIf="userToFollow$ | async"
        (click)="stopFollowingUser()"
        mat-raised-button
        color="primary">
        Stop following user
      </button>
      <div></div>
    </div>
  `,
  styleUrls: ['./follow-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowUserComponent {
  private store = inject(Store);

  public userToFollow$ = this.store.select(pageFeature.selectFollow).pipe(
    switchMap((follow) => {
      return this.store.select(boardFeature.selectUsers).pipe(
        map((users) => {
          return users.find((user) => user.id === follow);
        })
      );
    })
  );

  public stopFollowingUser() {
    this.store.dispatch(PageActions.followUser({ id: '' }));
  }

  constructor() {
    this.userToFollow$.pipe(filterNil()).subscribe((user) => {
      if (user.position && user.zoom) {
        this.store.dispatch(
          PageActions.setUserView({
            zoom: user.zoom,
            position: user.position,
          })
        );
      }
    });
  }
}
