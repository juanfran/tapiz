import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { AuthUserModel, defaultUserSettings } from '@tapiz/board-commons';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../services/auth.service';
import { UserApiService } from '../../../../services/user-api.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let apiToken: ReturnType<typeof vi.fn>;
  let generateApiToken: ReturnType<typeof vi.fn>;
  let updateSettings: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof signal<AuthUserModel | null>>;

  beforeEach(() => {
    user = signal<AuthUserModel | null>({
      id: 'user-1',
      name: 'Ada',
      picture: '',
      settings: defaultUserSettings,
    });

    apiToken = vi.fn(() => of({ hasToken: true, createdAt: '2026-06-25' }));
    generateApiToken = vi.fn(() =>
      of({ token: 'tapiz_pat_generated', createdAt: '2026-06-25' }),
    );
    updateSettings = vi.fn(() => of(defaultUserSettings));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: Store,
          useValue: {
            dispatch: vi.fn(),
            selectSignal: () => user,
          },
        },
        {
          provide: UserApiService,
          useValue: {
            apiToken,
            generateApiToken,
            updateSettings,
          },
        },
        {
          provide: AuthService,
          useValue: {
            setLocalStoreUser: vi.fn(),
          },
        },
      ],
    });
  });

  it('keeps the api token state after reloading settings', () => {
    const component = TestBed.runInInjectionContext(
      () => new SettingsComponent(),
    );

    expect(apiToken).toHaveBeenCalledOnce();
    expect(component.apiTokenLoading()).toEqual(false);
    expect(component.apiTokenExists()).toEqual(true);
    expect(component.generatedApiToken()).toBeNull();
  });

  it('shows the newly generated token without waiting for save', () => {
    const component = TestBed.runInInjectionContext(
      () => new SettingsComponent(),
    );

    component.generateApiToken();

    expect(generateApiToken).toHaveBeenCalledOnce();
    expect(updateSettings).not.toHaveBeenCalled();
    expect(component.apiTokenExists()).toEqual(true);
    expect(component.generatedApiToken()).toEqual('tapiz_pat_generated');
  });

  it('preserves board navigation settings when saving note defaults', () => {
    const currentUser = user();

    if (!currentUser) {
      throw new Error('Expected an authenticated user');
    }

    user.set({
      ...currentUser,
      settings: {
        ...defaultUserSettings,
        wheelInputMode: 'trackpad',
      },
    });
    const component = TestBed.runInInjectionContext(
      () => new SettingsComponent(),
    );

    component.save();

    expect(updateSettings).toHaveBeenCalledWith({
      ...defaultUserSettings,
      wheelInputMode: 'trackpad',
    });
  });
});
