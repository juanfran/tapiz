import { Action, createFeature, createReducer, on } from '@ngrx/store';
import {
  Board,
  Invitation,
  UserTeam,
  UserInvitation,
  TeamMember,
  SortBoard,
} from '@team-up/board-commons';
import { produce } from 'immer';
import { HomeActions } from './home.actions';

export interface HomeState {
  boards: Board[];
  teams: UserTeam[];
  invitations: Invitation[];
  members: TeamMember[];
  userInvitations: UserInvitation[];
  sortBy: SortBoard;
  currentTeamId: string | null;
}

const sortBy = localStorage.getItem('boardSortBy') ?? '-createdAt';

const initialHomeState: HomeState = {
  boards: [],
  teams: [],
  invitations: [],
  members: [],
  userInvitations: [],
  sortBy: sortBy as SortBoard,
  currentTeamId: null,
};

const reducer = createReducer(
  initialHomeState,
  on(
    HomeActions.initHome,
    HomeActions.initAllBoardsPage,
    HomeActions.initTeamPage,
    HomeActions.initStarredPage,
    (state, action): HomeState => {
      state.invitations = [];
      state.members = [];
      state.boards = [];
      state.currentTeamId = null;

      if (action.type === HomeActions.initTeamPage.type) {
        state.currentTeamId = action.teamId;
      }

      return state;
    }
  ),
  on(HomeActions.fetchBoardsSuccess, (state, { boards }): HomeState => {
    state.boards = boards;

    return state;
  }),
  on(
    HomeActions.removeBoard,
    HomeActions.leaveBoard,
    (state, { id }): HomeState => {
      state.boards = state.boards.filter((board) => {
        return board.id !== id;
      });

      return state;
    }
  ),
  on(HomeActions.fetchTeamsSuccess, (state, { teams }): HomeState => {
    state.teams = teams;

    return state;
  }),
  on(HomeActions.createTeamSuccess, (state, { team }): HomeState => {
    state.teams.unshift(team);

    return state;
  }),
  on(HomeActions.deleteTeamSuccess, (state, { id }): HomeState => {
    state.teams = state.teams.filter((team) => {
      return team.id !== id;
    });

    return state;
  }),
  on(HomeActions.fetchTeamsInvitationsSuccess, (state, { invitations }) => {
    state.invitations = invitations.map((invitation) => {
      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
      } as Invitation;
    });

    return state;
  }),
  on(HomeActions.initTeamMembersModal, (state) => {
    state.invitations = [];
    state.members = [];

    return state;
  }),
  on(HomeActions.fetchTeamMembersSuccess, (state, { members }) => {
    state.members = members;

    return state;
  }),
  on(HomeActions.inviteToTeamSuccess, (state, { invitation }) => {
    state.invitations.unshift(invitation);

    return state;
  }),
  on(HomeActions.deleteTeamInvitation, (state, { id }) => {
    state.invitations = state.invitations.filter((invitation) => {
      return invitation.id !== id;
    });

    return state;
  }),
  on(HomeActions.renameTeam, (state, { id, name }) => {
    state.teams = state.teams.map((team) => {
      if (team.id === id) {
        team.name = name;
      }

      return team;
    });

    return state;
  }),
  on(HomeActions.fetchUserInvitationsSuccess, (state, { invitations }) => {
    state.userInvitations = invitations;

    return state;
  }),
  on(HomeActions.acceptInvitation, (state, { invitation }) => {
    state.userInvitations = state.userInvitations.filter((inv) => {
      return inv.id !== invitation.id;
    });

    return state;
  }),
  on(HomeActions.rejectInvitation, (state, { invitation }) => {
    state.userInvitations = state.userInvitations.filter((inv) => {
      return inv.id !== invitation.id;
    });

    return state;
  }),
  on(HomeActions.leaveTeam, (state, { id }) => {
    state.teams = state.teams.filter((team) => {
      return team.id !== id;
    });

    return state;
  }),
  on(
    HomeActions.deleteTeamMemberSuccess,
    (state, { id, teamId, currentUserId }) => {
      if (id === currentUserId) {
        state.teams = state.teams.filter((team) => {
          return team.id !== teamId;
        });
      }

      state.members = state.members.filter((member) => {
        return member.id !== id;
      });

      return state;
    }
  ),
  on(
    HomeActions.changeRoleSuccess,
    (state, { memberId, teamId, currentUserId, role }) => {
      if (memberId === currentUserId) {
        state.teams = state.teams.map((team) => {
          if (team.id === teamId) {
            team.teamMember.role = role;
          }

          return team;
        });
      }

      state.members = state.members.map((member) => {
        if (member.id === memberId) {
          member.role = role;
        }

        return member;
      });

      return state;
    }
  ),
  on(HomeActions.duplicateBoardSuccess, (state, { board }) => {
    state.boards.unshift(board);

    return state;
  }),
  on(HomeActions.renameBoard, (state, { id, name }) => {
    state.boards = state.boards.map((board) => {
      if (board.id === id) {
        board.name = name;
      }

      return board;
    });

    return state;
  }),
  on(HomeActions.starBoard, (state, { id }) => {
    state.boards = state.boards.map((board) => {
      if (board.id === id) {
        board.starred = true;
      }

      return board;
    });

    return state;
  }),
  on(HomeActions.unstarBoard, (state, { id }) => {
    state.boards = state.boards.map((board) => {
      if (board.id === id) {
        board.starred = false;
      }

      return board;
    });

    return state;
  }),
  on(HomeActions.changeBoardSortBy, (state, { sortBy }) => {
    state.sortBy = sortBy;

    return state;
  }),
  on(HomeActions.transferBoard, (state, { id, teamId }) => {
    state.boards = state.boards.map((board) => {
      if (board.id === id) {
        board.teamId = teamId;
      }

      return board;
    });

    if (state.currentTeamId !== teamId) {
      state.boards = state.boards.filter((board) => {
        return board.id !== id;
      });
    }

    return state;
  })
);

export const homeFeature = createFeature({
  name: 'home',
  reducer: (state: HomeState = initialHomeState, action: Action) => {
    return produce(state, (draft: HomeState) => {
      return reducer(draft, action);
    });
  },
});
