import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { AuthUserModel, defaultUserSettings } from '@tapiz/board-commons';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../services/auth.service';
import { ConfigService } from '../../../../services/config.service';
import { UserApiService } from '../../../../services/user-api.service';
import { BoardWheelInputService } from '../../services/board-wheel-input.service';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  const authUser = signal<AuthUserModel | null>({
    id: 'user-1',
    name: 'Ada',
    picture: '',
    settings: defaultUserSettings,
  });
  let dispatch: ReturnType<typeof vi.fn>;
  let updateSettings: ReturnType<typeof vi.fn>;
  let setLocalStoreUser: ReturnType<typeof vi.fn>;
  let setDemoMode: ReturnType<typeof vi.fn>;
  let openSnackBar: ReturnType<typeof vi.fn>;
  const config = { DEMO: false };
  const wheelMode = signal<'auto' | 'mouse' | 'trackpad'>('auto');

  beforeEach(() => {
    config.DEMO = false;
    wheelMode.set('auto');
    authUser.set({
      id: 'user-1',
      name: 'Ada',
      picture: '',
      settings: defaultUserSettings,
    });
    dispatch = vi.fn();
    updateSettings = vi.fn((settings) => of(settings));
    setLocalStoreUser = vi.fn();
    setDemoMode = vi.fn((mode) => wheelMode.set(mode));
    openSnackBar = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: Store,
          useValue: {
            dispatch,
            selectSignal: () => authUser,
          },
        },
        {
          provide: UserApiService,
          useValue: { updateSettings },
        },
        {
          provide: AuthService,
          useValue: {
            setLocalStoreUser,
          },
        },
        {
          provide: MatSnackBar,
          useValue: { open: openSnackBar },
        },
        {
          provide: ConfigService,
          useValue: { config },
        },
        {
          provide: BoardWheelInputService,
          useValue: { mode: wheelMode, setDemoMode },
        },
      ],
    });
  });

  it('saves the selected wheel input mode and updates the current user', () => {
    const component = TestBed.runInInjectionContext(
      () => new UserMenuComponent(),
    );

    component.selectWheelInputMode('trackpad');

    const currentUser = authUser();

    if (!currentUser) {
      throw new Error('Expected an authenticated user');
    }

    const updatedUser: AuthUserModel = {
      ...currentUser,
      settings: {
        ...defaultUserSettings,
        wheelInputMode: 'trackpad',
      },
    };
    expect(updateSettings).toHaveBeenCalledWith(updatedUser.settings);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ user: updatedUser }),
    );
    expect(setLocalStoreUser).toHaveBeenCalledWith(updatedUser);
  });

  it('does not save the already selected mode', () => {
    const component = TestBed.runInInjectionContext(
      () => new UserMenuComponent(),
    );

    component.selectWheelInputMode('auto');

    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('stores the selected mode locally in Demo without an authenticated user', () => {
    config.DEMO = true;
    authUser.set(null);
    const component = TestBed.runInInjectionContext(
      () => new UserMenuComponent(),
    );

    component.selectWheelInputMode('trackpad');

    expect(setDemoMode).toHaveBeenCalledWith('trackpad');
    expect(component.currentMode()).toBe('trackpad');
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('rolls back the optimistic update when persistence fails', () => {
    updateSettings.mockReturnValueOnce(
      throwError(() => new Error('Settings request failed')),
    );
    const component = TestBed.runInInjectionContext(
      () => new UserMenuComponent(),
    );
    const currentUser = authUser();

    if (!currentUser) {
      throw new Error('Expected an authenticated user');
    }

    component.selectWheelInputMode('trackpad');

    const optimisticUser: AuthUserModel = {
      ...currentUser,
      settings: {
        ...defaultUserSettings,
        wheelInputMode: 'trackpad',
      },
    };
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ user: optimisticUser }),
    );
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ user: currentUser }),
    );
    expect(setLocalStoreUser).toHaveBeenNthCalledWith(1, optimisticUser);
    expect(setLocalStoreUser).toHaveBeenNthCalledWith(2, currentUser);
    expect(openSnackBar).toHaveBeenCalledWith(
      'Could not save navigation preference',
      'Close',
      { duration: 4000 },
    );
    expect(component.savingMode()).toBeNull();
  });
});
