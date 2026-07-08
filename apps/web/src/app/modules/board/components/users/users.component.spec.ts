import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardFacade } from '../../../../services/board-facade.service';
import { ConfigService } from '../../../../services/config.service';
import { UsersComponent } from './users.component';

describe('UsersComponent', () => {
  beforeEach(() => {
    const selectSignal = vi
      .fn()
      .mockReturnValueOnce(signal([]))
      .mockReturnValueOnce(signal(0))
      .mockReturnValueOnce(signal('demo-user'))
      .mockReturnValueOnce(signal(null))
      .mockReturnValueOnce(signal(null));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: Store,
          useValue: { dispatch: vi.fn(), selectSignal },
        },
        {
          provide: BoardFacade,
          useValue: { users: signal([]), settings: signal(undefined) },
        },
        {
          provide: ConfigService,
          useValue: { config: { DEMO: true } },
        },
      ],
    });
  });

  it('provides a local current user for the Demo menu', () => {
    const component = TestBed.runInInjectionContext(() => new UsersComponent());

    expect(component.currentUser()).toEqual({
      id: 'demo-user',
      name: 'Demo user',
      visible: true,
      connected: true,
      cursor: null,
    });
  });
});
