import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import {
  AuthUserModel,
  User,
  WheelInputMode,
  withDefaultUserSettings,
} from '@tapiz/board-commons';
import { finalize } from 'rxjs';
import { AppActions } from '../../../../+state/app.actions';
import { appFeature } from '../../../../+state/app.reducer';
import { AuthService } from '../../../../services/auth.service';
import { ConfigService } from '../../../../services/config.service';
import { UserApiService } from '../../../../services/user-api.service';
import { BoardPageActions } from '../../actions/board-page.actions';
import { BoardWheelInputService } from '../../services/board-wheel-input.service';

interface WheelInputOption {
  value: WheelInputMode;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'tapiz-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDividerModule, MatIconModule, MatMenuModule, NgOptimizedImage],
})
export class UserMenuComponent {
  #store = inject(Store);
  #userApiService = inject(UserApiService);
  #authService = inject(AuthService);
  #configService = inject(ConfigService);
  #wheelInput = inject(BoardWheelInputService);
  #snackBar = inject(MatSnackBar);
  #authUser = this.#store.selectSignal(appFeature.selectUser);

  user = input.required<User>();
  picture = input('');
  savingMode = signal<WheelInputMode | null>(null);
  readonly currentMode = this.#wheelInput.mode;
  readonly isDemo = this.#configService.config.DEMO;

  readonly wheelInputOptions: readonly WheelInputOption[] = [
    {
      value: 'auto',
      label: 'Auto',
      description: 'Detect the device from wheel gestures',
      icon: 'tune',
    },
    {
      value: 'mouse',
      label: 'Mouse',
      description: 'Use the wheel to zoom',
      icon: 'mouse',
    },
    {
      value: 'trackpad',
      label: 'Trackpad',
      description: 'Use two fingers to move the board',
      icon: 'touch_app',
    },
  ];

  selectWheelInputMode(wheelInputMode: WheelInputMode) {
    if (this.currentMode() === wheelInputMode || this.savingMode()) {
      return;
    }

    if (this.#configService.config.DEMO) {
      this.#wheelInput.setDemoMode(wheelInputMode);
      return;
    }

    const currentUser = this.#authUser();

    if (!currentUser) {
      return;
    }

    const settings = {
      ...withDefaultUserSettings(currentUser.settings),
      wheelInputMode,
    };
    const optimisticUser: AuthUserModel = {
      ...currentUser,
      settings,
    };

    this.savingMode.set(wheelInputMode);
    this.#setCurrentUser(optimisticUser);

    this.#userApiService
      .updateSettings(settings)
      .pipe(finalize(() => this.savingMode.set(null)))
      .subscribe({
        next: (savedSettings) => {
          this.#setCurrentUser({
            ...optimisticUser,
            settings: savedSettings,
          });
        },
        error: () => {
          this.#setCurrentUser(currentUser);
          this.#snackBar.open('Could not save navigation preference', 'Close', {
            duration: 4000,
          });
        },
      });
  }

  toggleUserHighlight() {
    this.#store.dispatch(
      BoardPageActions.toggleUserHighlight({ id: this.user().id }),
    );
  }

  showVotes() {
    this.#store.dispatch(
      BoardPageActions.toggleShowVotes({ userId: this.user().id }),
    );
  }

  #setCurrentUser(user: AuthUserModel) {
    this.#store.dispatch(AppActions.setUser({ user }));
    this.#authService.setLocalStoreUser(user);
  }
}
