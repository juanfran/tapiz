import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { pageFeature } from '../../modules/board/reducers/page.reducer';
import { map, switchMap } from 'rxjs';
import { filterNil } from '../../commons/operators/filter-nil';
import { PageActions } from '../../modules/board/actions/page.actions';
import { MatButtonModule } from '@angular/material/button';
import { BoardFacade } from '../../services/board-facade.service';

@Component({
  selector: 'tapiz-follow-user',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="wrapper">
      @if (userToFollow$ | async) {
        <button
          (click)="stopFollowingUser()"
          mat-raised-button
          color="primary">
          Stop following user
        </button>
      }
      <div></div>
    </div>
  `,
  styleUrls: ['./follow-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowUserComponent {
  private store = inject(Store);
  private boardFacade = inject(BoardFacade);

  public userToFollow$ = this.store.select(pageFeature.selectFollow).pipe(
    switchMap((follow) => {
      return this.boardFacade.getUsers().pipe(
        map((users) => {
          return users.find((user) => user.id === follow)?.content;
        }),
      );
    }),
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
          }),
        );
      }
    });
  }
}
