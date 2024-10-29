import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { AppActions } from '../../../../+state/app.actions';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { appFeature } from '../../../../+state/app.reducer';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'tapiz-user-notifications',
  styleUrls: ['./user-notifications.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    InfiniteScrollDirective,
  ],
  template: `
    @if (notifications().size > 0) {
      <button
        [matMenuTriggerFor]="notificationsMenu"
        [matBadge]="notifications().size"
        matBadgeColor="warn"
        type="button">
        <mat-icon>notifications</mat-icon>
      </button>

      <mat-menu #notificationsMenu="matMenu">
        <div
          class="wrapper"
          infiniteScroll
          [infiniteScrollDistance]="2"
          [infiniteScrollThrottle]="50"
          [scrollWindow]="false"
          (scrolled)="onScroll()">
          <div class="notifications-header">
            <button
              mat-button
              (click)="clearNotifications()">
              Clear all
              <mat-icon>clear</mat-icon>
            </button>
          </div>

          @for (notification of notifications().items; track notification.id) {
            @if (notification.type === 'mention') {
              <a
                [routerLink]="['/board', notification.boardId]"
                [queryParams]="{ nodeId: notification.nodeId }">
                You were mentioned by
                <span class="highlight">{{ notification.userName }}</span> on
                <span class="highlight">{{ notification.boardName }}</span>
              </a>
            }
          }
        </div>
      </mat-menu>
    }
  `,
})
export class UserNotificationsComponent {
  #store = inject(Store);
  #offset = 0;
  notifications = this.#store.selectSignal(appFeature.selectNotifications);

  clearNotifications() {
    this.#store.dispatch(AppActions.clearNotifications());
  }

  onScroll() {
    this.#offset += 10;
    this.#store.dispatch(
      AppActions.fetchNotifications({ offset: this.#offset }),
    );
  }
}
