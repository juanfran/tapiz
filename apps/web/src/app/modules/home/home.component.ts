import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule, NgOptimizedImage } from '@angular/common';
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

@Component({
  selector: 'tapiz-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    RouterModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatBadgeModule,
    NgOptimizedImage,
  ],
})
export class HomeComponent {
  #authService = inject(AuthService);
  #store = inject(Store);
  #dialog = inject(MatDialog);
  #subscriptionService = inject(SubscriptionService);

  teams = this.#store.selectSignal(homeFeature.selectTeams);
  invitations = this.#store.selectSignal(homeFeature.selectUserInvitations);
  user = this.#store.selectSignal(appFeature.selectUser);

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
      .subscribe(() => {
        this.#store.dispatch(HomeActions.fetchTeams());
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
