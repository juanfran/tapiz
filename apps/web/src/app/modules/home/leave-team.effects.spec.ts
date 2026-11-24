import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { describe, expect, it, vi } from 'vitest';
import { Action } from '@ngrx/store';
import type { Actions } from '@ngrx/effects';
import type { Router } from '@angular/router';
// Kept outside `+state/`: browser-mode test URLs don't handle the `+`.
import { HomeActions } from './+state/home.actions';
import { leaveTeam$ } from './+state/effects/home.effects';
import type { TeamApiService } from '../../services/team-api.service';
import type { NotificationService } from '../../shared/notification/notification.service';

function run(leaveTeam: () => ReturnType<TeamApiService['leaveTeam']>) {
  const actions$ = new Subject<Action>();
  const router = { navigate: vi.fn() };
  const notifications = { open: vi.fn() };
  const output = firstValueFrom(
    leaveTeam$(
      actions$ as unknown as Actions,
      { leaveTeam: vi.fn(leaveTeam) } as unknown as TeamApiService,
      router as unknown as Router,
      notifications as unknown as NotificationService,
    ).pipe(toArray()),
  );
  return { actions$, router, notifications, output };
}

describe('leaveTeam$', () => {
  it('navigates home after leaving', async () => {
    const { actions$, router, notifications, output } = run(() =>
      of({ success: true } as never),
    );

    actions$.next(HomeActions.leaveTeam({ id: 'team-1' }));
    actions$.complete();

    expect(await output).toEqual([HomeActions.fetchTeams()]);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(notifications.open).not.toHaveBeenCalled();
  });

  it('explains a refused leave, reloads teams and keeps working', async () => {
    const { actions$, router, notifications, output } = run(() =>
      throwError(() => ({ data: { code: 'CONFLICT' } })),
    );

    actions$.next(HomeActions.leaveTeam({ id: 'team-1' }));
    actions$.next(HomeActions.leaveTeam({ id: 'team-2' }));
    actions$.complete();

    expect(await output).toEqual([
      HomeActions.fetchTeams(),
      HomeActions.fetchTeams(),
    ]);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(notifications.open).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('make someone else an admin'),
      }),
    );
  });

  it('does not blame the admin rule for other failures', async () => {
    const { actions$, notifications, output } = run(() =>
      throwError(() => new Error('Network error')),
    );

    actions$.next(HomeActions.leaveTeam({ id: 'team-1' }));
    actions$.complete();

    expect(await output).toEqual([HomeActions.fetchTeams()]);
    expect(notifications.open).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Could not leave the team. Please try again.',
      }),
    );
  });
});
