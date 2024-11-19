import { BoardApiService } from '../../../../services/board-api.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { exhaustMap, filter, map, mergeMap, switchMap, tap } from 'rxjs';
import { HomeActions } from '../home.actions';
import { AuthService } from '../../../../services/auth.service';
import { TeamApiService } from '../../../../services/team-api.service';
import { homeFeature } from '../home.feature';
import { Store } from '@ngrx/store';
import { filterNil } from '../../../../commons/operators/filter-nil';
import { UserApiService } from '../../../../services/user-api.service';
import { appFeature } from '../../../../+state/app.reducer';
import { selectRouteParams } from '../../../../router.selectors';

export const initHomeFeatchTeams$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(
        HomeActions.initHome,
        HomeActions.acceptInvitationSuccess,
        HomeActions.eventUpdateTeam,
      ),
      exhaustMap(() => {
        return teamApiService.fetchTeams();
      }),
      map((teams) => {
        teams.reverse();

        return HomeActions.fetchTeamsSuccess({ teams });
      }),
    );
  },
  {
    functional: true,
  },
);

export const createTeam$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.createTeam),
      mergeMap((action) => {
        return teamApiService.createTeam(action.name);
      }),
      map((team) => {
        return HomeActions.createTeamSuccess({ team });
      }),
    );
  },
  {
    functional: true,
  },
);

export const createTeamSuccess$ = createEffect(
  (actions$ = inject(Actions), router = inject(Router)) => {
    return actions$.pipe(
      ofType(HomeActions.createTeamSuccess),
      tap((team) => {
        void router.navigate(['/team', team.team.id]);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const deleteTeam$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.deleteTeam),
      mergeMap((action) => {
        return teamApiService.deleteTeam(action.id).pipe(
          map(() => {
            return HomeActions.deleteTeamSuccess({ id: action.id });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const deleteTeamSuccess$ = createEffect(
  (
    actions$ = inject(Actions),
    store = inject(Store),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.deleteTeamSuccess),
      concatLatestFrom(() => {
        return store.select(homeFeature.selectCurrentTeamId);
      }),
      filter(([action, teamId]) => {
        return action.id === teamId;
      }),
      tap(() => {
        void router.navigate(['/']);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const createBoard$ = createEffect(
  (
    actions$ = inject(Actions),
    boardApiService = inject(BoardApiService),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.createBoard),
      mergeMap((action) => {
        return boardApiService.createBoard(action.name, action.teamId);
      }),
      tap((result) => {
        sessionStorage.setItem('new-board', result.id);

        void router.navigate(['/board', result.id]);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const deleteBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.removeBoard),
      mergeMap((action) => {
        return boardApiService.removeBoard(action.id);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const leaveBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.leaveBoard),
      mergeMap((action) => {
        return boardApiService.leaveBoard(action.id);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const duplicateBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.duplicateBoard),
      mergeMap((action) => {
        return boardApiService.duplicateBoard(action.id);
      }),
      map((board) => {
        return HomeActions.duplicateBoardSuccess({ board });
      }),
    );
  },
  {
    functional: true,
  },
);

export const fetchBoards$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.fetchBoardsPage),
      switchMap((action) => {
        if (action.sortBy) {
          localStorage.setItem('boardSortBy', action.sortBy);
        }

        return boardApiService
          .fetchBoards({
            limit: action.limit,
            offset: action.offset,
            starred: action.starred,
            teamId: action.teamId,
            sortBy: action.sortBy,
          })
          .pipe(
            map((boards) => {
              return HomeActions.fetchBoardsSuccess({ boards });
            }),
          );
      }),
    );
  },
  {
    functional: true,
  },
);

export const removeAccount$ = createEffect(
  (
    actions$ = inject(Actions),
    userApiService = inject(UserApiService),
    authService = inject(AuthService),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.removeAccount),
      exhaustMap(() => {
        return userApiService.removeAccount().pipe(
          tap(() => {
            authService.logout();
          }),
        );
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const inviteToTeam$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.inviteToTeam),
      mergeMap((action) => {
        return teamApiService
          .inviteToTeam(
            action.id,
            action.invitation.email,
            action.invitation.role,
          )
          .pipe(
            map((invitation) => {
              return HomeActions.inviteToTeamSuccess({
                id: action.id,
                invitation,
              });
            }),
          );
      }),
    );
  },
  {
    functional: true,
  },
);

export const fetchTeamInvitations$ = createEffect(
  (
    actions$ = inject(Actions),
    teamApiService = inject(TeamApiService),
    store = inject(Store),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.initTeamMembersModal),
      concatLatestFrom((action) => {
        return store.select(homeFeature.selectTeams).pipe(
          map((teams) => {
            return teams.find((team) => team.id === action.teamId);
          }),
          filterNil(),
        );
      }),
      filter(([, team]) => {
        return team.teamMember.role === 'admin';
      }),
      switchMap(([, team]) => {
        return teamApiService.teamInvitations(team.id).pipe(
          map((invitations) => {
            return HomeActions.fetchTeamsInvitationsSuccess({ invitations });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const fetchTeamMembers$ = createEffect(
  (
    actions$ = inject(Actions),
    teamApiService = inject(TeamApiService),
    store = inject(Store),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.initTeamMembersModal),
      concatLatestFrom((action) => {
        return store.select(homeFeature.selectTeams).pipe(
          map((teams) => {
            return teams.find((team) => team.id === action.teamId);
          }),
          filterNil(),
        );
      }),
      filter(([, team]) => {
        return team.teamMember.role === 'admin';
      }),
      switchMap(([, team]) => {
        return teamApiService.teamMembers(team.id).pipe(
          map((members) => {
            return HomeActions.fetchTeamMembersSuccess({ members });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const deleteInvitation$ = createEffect(
  (actions$ = inject(Actions), userApiService = inject(UserApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.deleteTeamInvitation),
      mergeMap((action) => {
        return userApiService.cancelInvitation(action.id);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const changeInvitationRole = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.changeInvitationRole),
      mergeMap((action) => {
        return teamApiService.changeInvitationRole(action.id, action.role).pipe(
          map(() => {
            return HomeActions.changeInvitationRoleSuccess({
              id: action.id,
              role: action.role,
            });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const deleteTeamMember$ = createEffect(
  (
    actions$ = inject(Actions),
    teamApiService = inject(TeamApiService),
    store = inject(Store),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.deleteTeamMember),
      concatLatestFrom(() => {
        return store.select(appFeature.selectUserId);
      }),
      mergeMap(([action, userId]) => {
        return teamApiService.deleteMember(action.teamId, action.id).pipe(
          map(() => {
            if (userId === action.id) {
              router.navigate(['/']);
            }

            return HomeActions.deleteTeamMemberSuccess({
              id: action.id,
              teamId: action.teamId,
              currentUserId: userId,
            });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const changeRole$ = createEffect(
  (
    actions$ = inject(Actions),
    teamApiService = inject(TeamApiService),
    store = inject(Store),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.changeRole),
      concatLatestFrom(() => {
        return store.select(appFeature.selectUserId);
      }),
      mergeMap(([action, userId]) => {
        return teamApiService
          .changeRole(action.teamId, action.memberId, action.role)
          .pipe(
            map(() => {
              return HomeActions.changeRoleSuccess({
                memberId: action.memberId,
                teamId: action.teamId,
                role: action.role,
                currentUserId: userId,
              });
            }),
          );
      }),
    );
  },
  {
    functional: true,
  },
);

export const renameTeam$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.renameTeam),
      mergeMap((action) => {
        return teamApiService.renameTeam(action.id, action.name);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const initHomeInvitations$ = createEffect(
  (actions$ = inject(Actions), usersApiService = inject(UserApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.initHome, HomeActions.userEvent),
      switchMap(() => {
        return usersApiService.invites();
      }),
      map((invitations) => {
        return HomeActions.fetchUserInvitationsSuccess({ invitations });
      }),
    );
  },
  {
    functional: true,
  },
);

export const acceptInvitation$ = createEffect(
  (actions$ = inject(Actions), usersApiService = inject(UserApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.acceptInvitation),
      mergeMap((action) => {
        return usersApiService.acceptInvitation(action.invitation.id).pipe(
          map(() => {
            return HomeActions.acceptInvitationSuccess({
              invitation: action.invitation,
            });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const acceptInvitationSuccess$ = createEffect(
  (actions$ = inject(Actions), router = inject(Router)) => {
    return actions$.pipe(
      ofType(HomeActions.acceptInvitationSuccess),
      tap((team) => {
        if (!team.invitation.team) {
          return;
        }

        void router.navigate(['/team', team.invitation.team.id]);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const rejectInvitation$ = createEffect(
  (actions$ = inject(Actions), userApiService = inject(UserApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.rejectInvitation),
      mergeMap((action) => {
        return userApiService.cancelInvitation(action.invitation.id);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const leaveTeam$ = createEffect(
  (
    actions$ = inject(Actions),
    teamApiService = inject(TeamApiService),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.leaveTeam),
      mergeMap((action) => {
        return teamApiService.leaveTeam(action.id);
      }),
      tap(() => {
        router.navigate(['/']);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const createSpace$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.createSpace),
      mergeMap((action) => {
        return teamApiService.createSpace(
          action.teamId,
          action.name,
          action.boards,
        );
      }),
      filterNil(),
      map((space) => {
        return HomeActions.createSpaceSuccess({ space });
      }),
    );
  },
  {
    functional: true,
  },
);

export const createSpaceSuccess$ = createEffect(
  (actions$ = inject(Actions), router = inject(Router)) => {
    return actions$.pipe(
      ofType(HomeActions.createSpaceSuccess),
      tap((action) => {
        void router.navigate([
          '/team',
          action.space.teamId,
          'space',
          action.space.id,
        ]);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const updateSpace$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.updateSpace),
      mergeMap((action) => {
        return teamApiService.updateSpace(
          action.spaceId,
          action.name,
          action.boards,
        );
      }),
      map((space) => {
        return HomeActions.updateSpaceSuccess({ space });
      }),
    );
  },
  {
    functional: true,
  },
);

export const eventUpdateTeam$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) => {
    return actions$.pipe(
      ofType(HomeActions.eventUpdateTeam),
      concatLatestFrom(() => {
        return store.select(homeFeature.selectTeamSpaces);
      }),
      filter(([action, spaces]) => {
        return action.teamId === spaces?.teamId;
      }),
      map(([action]) => {
        return HomeActions.fetchTeamSpaces({ teamId: action.teamId });
      }),
    );
  },
  {
    functional: true,
  },
);

export const deleteSpace$ = createEffect(
  (actions$ = inject(Actions), teamApiService = inject(TeamApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.deleteSpace),
      mergeMap((action) => {
        return teamApiService.deleteSpace(action.spaceId).pipe(
          map(() => {
            return HomeActions.deleteSpaceSuccess({ id: action.spaceId });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const deleteSpaceSuccess$ = createEffect(
  (
    actions$ = inject(Actions),
    store = inject(Store),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(HomeActions.deleteSpaceSuccess),
      concatLatestFrom(() => {
        return store.select(selectRouteParams);
      }),
      filter(([action, params]) => {
        return params['spaceId'] === action.id;
      }),
      tap(([, params]) => {
        void router.navigate(['/team', params['id']]);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const renameBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.renameBoard),
      mergeMap((action) => {
        return boardApiService.renameBoard(action.id, action.name);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const addStar$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.starBoard),
      mergeMap((action) => {
        return boardApiService.addStar(action.id);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const removeStar$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.unstarBoard),
      mergeMap((action) => {
        return boardApiService.removeStar(action.id);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);

export const transferBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.transferBoard),
      mergeMap((action) => {
        return boardApiService.transferBoard(action.id, action.teamId);
      }),
    );
  },
  {
    functional: true,
    dispatch: false,
  },
);
