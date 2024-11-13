import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { NgOptimizedImage } from '@angular/common';
import { Store } from '@ngrx/store';
import { HomeActions } from './+state/home.actions';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateTeamComponent } from './components/create-team/create-team.component';
import { homeFeature } from './+state/home.feature';
import { filter, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { UserInvitationsComponent } from './components/user-invitations/user-invitations.component';
import { AuthService } from '../../services/auth.service';
import { ConfirmComponent } from '../../shared/confirm-action/confirm-actions.component';
import { SubscriptionService } from '../../services/subscription.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { appFeature } from '../../+state/app.reducer';
import { UserNotificationsComponent } from './components/user-notifications/users-notifications.component';
import { TeamMenuComponent } from './components/team-menu/team-menu.component';
import { SpaceMenuComponent } from './components/space-menu/space-menu.component';
import { injectQueryParams } from 'ngxtension/inject-query-params';

@Component({
  selector: 'tapiz-home',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
  standalone: true,
  imports: [
    MatMenuModule,
    RouterModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatBadgeModule,
    NgOptimizedImage,
    UserNotificationsComponent,
    TeamMenuComponent,
    SpaceMenuComponent,
  ],
  template: `<div class="header">
      <a
        class="logo"
        routerLink="/">
        <img
          priority="true"
          ngSrc="/assets/logo-45.webp"
          width="45"
          height="47"
          alt="Tapiz logo" />
        <span class="name">Tapiz</span>
      </a>
      <div class="inline-end-header">
        @if (invitations().length) {
          <button
            [matBadge]="invitations().length"
            matBadgeColor="warn"
            (click)="openInvitationDialog()"
            type="button">
            <mat-icon>mail</mat-icon>
          </button>
        }

        <tapiz-user-notifications />

        <button [matMenuTriggerFor]="menu">
          @if (user()?.picture; as picture) {
            <img
              class="avatar"
              [ngSrc]="picture"
              width="32"
              height="32"
              alt="User avatar" />
          } @else {
            <mat-icon>person</mat-icon>
          }
        </button>
        <mat-menu #menu="matMenu">
          <button
            mat-menu-item
            (click)="deleteAccount()">
            <mat-icon>person_remove</mat-icon>
            <span>Delete account</span>
          </button>
          <button
            mat-menu-item
            (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </div>
    </div>
    <div class="wrapper">
      <nav class="navigation-menu">
        <ul>
          <li
            class="menu-option"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }">
            <a routerLink="/">All boards</a>
          </li>
          <li
            class="menu-option"
            routerLinkActive="active">
            <a routerLink="/starred">Starred</a>
          </li>
        </ul>
        <div class="teams">
          <h4>
            Teams
            <button
              tuIconButton
              size="small"
              (click)="openCreateTeamDialog()"
              aria-label="Create team">
              <mat-icon>add</mat-icon>
            </button>
          </h4>
          <ul>
            @for (team of teams(); track team.id) {
              <li
                class="menu-option"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }">
                <a [routerLink]="['/team', team.id]">{{ team.name }}</a>

                <tapiz-team-menu [team]="team"></tapiz-team-menu>
              </li>
              @if (team.id === spaces()?.teamId) {
                <ul class="spaces">
                  @for (space of spaces()?.spaces; track space.id) {
                    <li
                      class="menu-option"
                      [class.active]="spaceId() === space.id">
                      <a
                        [routerLink]="['/team', team.id]"
                        [queryParams]="{ spaceId: space.id }"
                        >{{ space.name }}</a
                      >

                      <tapiz-space-menu
                        [space]="space"
                        [boards]="boards()" />
                    </li>
                  }
                </ul>
              }
            }
          </ul>
        </div>
      </nav>
      <div class="main">
        <router-outlet></router-outlet>
      </div>
    </div>`,
})
export class HomeComponent {
  #authService = inject(AuthService);
  #store = inject(Store);
  #dialog = inject(MatDialog);
  #subscriptionService = inject(SubscriptionService);

  teams = this.#store.selectSignal(homeFeature.selectTeams);
  invitations = this.#store.selectSignal(homeFeature.selectUserInvitations);
  user = this.#store.selectSignal(appFeature.selectUser);
  notifications = this.#store.selectSignal(appFeature.selectNotifications);
  teamId = this.#store.selectSignal(homeFeature.selectCurrentTeamId);
  spaces = this.#store.selectSignal(homeFeature.selectTeamSpaces);
  boards = this.#store.selectSignal(homeFeature.selectBoards);
  spaceId = injectQueryParams('spaceId');

  constructor() {
    this.#store.dispatch(HomeActions.initHome());

    this.#subscriptionService
      .userMessages()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.#store.dispatch(HomeActions.userEvent());
      });

    toObservable(this.teams)
      .pipe(
        takeUntilDestroyed(),
        switchMap((teams) => {
          return this.#subscriptionService.watchTeamIds(
            teams.map((it) => it.id),
          );
        }),
      )
      .subscribe((teamId) => {
        this.#store.dispatch(HomeActions.eventUpdateTeam({ teamId }));
      });
  }

  openCreateTeamDialog() {
    const dialogRef = this.#dialog.open(CreateTeamComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      this.#store.dispatch(HomeActions.createTeam({ name: result.name }));
    });
  }

  logout() {
    this.#authService.logout();
  }

  deleteAccount() {
    const dialogRef = this.#dialog.open(ConfirmComponent, {
      data: {
        title: 'Delete account?',
        description:
          'This will delete all your account. Your boards will still be accessible by other users.',
        confirm: {
          text: 'Delete account',
          color: 'warn',
        },
        cancel: {
          text: 'Cancel',
          color: 'basic',
        },
        align: 'end',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe(() => {
        this.#store.dispatch(HomeActions.removeAccount());
      });
  }

  openInvitationDialog() {
    this.#dialog.open(UserInvitationsComponent, {
      width: '600px',
      data: {
        invitations: this.invitations(),
      },
    });
  }
}
