import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { UserTeam, UserInvitation } from '@team-up/board-commons';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { AuthService } from '@/app/services/auth.service';
import { Store } from '@ngrx/store';
import { HomeActions } from './+state/home.actions';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateTeamComponent } from './components/create-team/create-team.component';
import { homeFeature } from './+state/home.feature';
import { trackByProp } from '@/app/shared/track-by-prop';
import { ConfirmComponent } from '@/app/shared/confirm-action/confirm-actions.component';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { UserInvitationsComponent } from './components/user-invitations/user-invitations.component';

interface State {
  teams: UserTeam[];
  invitations: UserInvitation[];
}

@Component({
  selector: 'team-up-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    RouterModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatBadgeModule,
  ],
})
export class HomeComponent {
  private authService = inject(AuthService);
  private store = inject(Store);
  private state = inject(RxState) as RxState<State>;
  private dialog = inject(MatDialog);

  public model$ = this.state.select();
  public trackById = trackByProp('id');

  constructor() {
    this.store.dispatch(HomeActions.initHome());

    this.state.connect('teams', this.store.select(homeFeature.selectTeams));
    this.state.connect(
      'invitations',
      this.store.select(homeFeature.selectUserInvitations)
    );
  }

  public openCreateTeamDialog() {
    const dialogRef = this.dialog.open(CreateTeamComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      this.store.dispatch(HomeActions.createTeam({ name: result.name }));
    });
  }

  public logout() {
    this.authService.logout();
  }

  public deleteAccount() {
    const dialogRef = this.dialog.open(ConfirmComponent, {
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
        this.store.dispatch(HomeActions.removeAccount());
      });
  }

  public openInvitationDialog() {
    this.dialog.open(UserInvitationsComponent, {
      width: '600px',
      data: {
        invitations: this.state.get('invitations'),
      },
    });
  }
}
