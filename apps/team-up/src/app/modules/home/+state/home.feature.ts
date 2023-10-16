import { Action, createFeature, createReducer, on } from '@ngrx/store';
import {
  Board,
  Invitation,
  UserTeam,
  UserInvitation,
  TeamMember,
  SortBoard,
} from '@team-up/board-commons';
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
      state = {
        ...state,
      };
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
    return {
      ...state,
      boards,
    };
  }),
  on(
    HomeActions.removeBoard,
    HomeActions.leaveBoard,
    (state, { id }): HomeState => {
      return {
        ...state,
        boards: state.boards.filter((board) => {
          return board.id !== id;
        }),
      };
    }
  ),
  on(HomeActions.fetchTeamsSuccess, (state, { teams }): HomeState => {
    return {
      ...state,
      teams,
    };
  }),
  on(HomeActions.createTeamSuccess, (state, { team }): HomeState => {
    state = {
      ...state,
      teams: [team, ...state.teams],
    };

    return state;
  }),
  on(HomeActions.deleteTeamSuccess, (state, { id }): HomeState => {
    return {
      ...state,
      teams: state.teams.filter((team) => {
        return team.id !== id;
      }),
    };
  }),
  on(HomeActions.fetchTeamsInvitationsSuccess, (state, { invitations }) => {
    return {
      ...state,
      invitations: invitations.map((invitation) => {
        return {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
        } as Invitation;
      }),
    };
  }),
  on(HomeActions.initTeamMembersModal, (state) => {
    return {
      ...state,
      invitations: [],
      members: [],
    };
  }),
  on(HomeActions.fetchTeamMembersSuccess, (state, { members }) => {
    return {
      ...state,
      members,
    };
  }),
  on(HomeActions.inviteToTeamSuccess, (state, { invitation }) => {
    return {
      ...state,
      invitations: [invitation, ...state.invitations],
    };
  }),
  on(HomeActions.deleteTeamInvitation, (state, { id }) => {
    return {
      ...state,
      invitations: state.invitations.filter((invitation) => {
        return invitation.id !== id;
      }),
    };
  }),
  on(HomeActions.renameTeam, (state, { id, name }) => {
    return {
      ...state,
      teams: state.teams.map((team) => {
        if (team.id === id) {
          return {
            ...team,
            name,
          };
        }

        return team;
      }),
    };
  }),
  on(HomeActions.fetchUserInvitationsSuccess, (state, { invitations }) => {
    return {
      ...state,
      userInvitations: invitations,
    };
  }),
  on(HomeActions.acceptInvitation, (state, { invitation }) => {
    return {
      ...state,
      userInvitations: state.userInvitations.filter((inv) => {
        return inv.id !== invitation.id;
      }),
    };
  }),
  on(HomeActions.rejectInvitation, (state, { invitation }) => {
    return {
      ...state,
      userInvitations: state.userInvitations.filter((inv) => {
        return inv.id !== invitation.id;
      }),
    };
  }),
  on(HomeActions.leaveTeam, (state, { id }) => {
    return {
      ...state,
      teams: state.teams.filter((team) => {
        return team.id !== id;
      }),
    };
  }),
  on(
    HomeActions.deleteTeamMemberSuccess,
    (state, { id, teamId, currentUserId }) => {
      state = {
        ...state,
      };

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
      state = {
        ...state,
      };

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
    return {
      ...state,
      boards: [board, ...state.boards],
    };
  }),
  on(HomeActions.renameBoard, (state, { id, name }) => {
    return {
      ...state,
      boards: state.boards.map((board) => {
        if (board.id === id) {
          return {
            ...board,
            name,
          };
        }

        return board;
      }),
    };
  }),
  on(HomeActions.starBoard, (state, { id }) => {
    return {
      ...state,
      boards: state.boards.map((board) => {
        if (board.id === id) {
          return {
            ...board,
            starred: true,
          };
        }

        return board;
      }),
    };
  }),
  on(HomeActions.unstarBoard, (state, { id }) => {
    return {
      ...state,
      boards: state.boards.map((board) => {
        if (board.id === id) {
          return {
            ...board,
            starred: false,
          };
        }

        return board;
      }),
    };
  }),
  on(HomeActions.changeBoardSortBy, (state, { sortBy }) => {
    return {
      ...state,
      sortBy,
    };
  }),
  on(HomeActions.transferBoard, (state, { id, teamId }) => {
    state = {
      ...state,
    };

    state.boards = state.boards.map((board) => {
      if (board.id === id) {
        return {
          ...board,
          teamId,
        };
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
  reducer,
});
