import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import {
  BoardUser,
  Invitation,
  UserTeam,
  UserInvitation,
  TeamMember,
  Space,
} from '@tapiz/board-commons';
import { HomeActions } from './home.actions';

export interface HomeState {
  boards: BoardUser[];
  teams: UserTeam[];
  loadingBoards: boolean;
  invitations: Invitation[];
  members: TeamMember[];
  userInvitations: UserInvitation[];
  currentTeamId: string | null;
  teamSpaces: {
    teamId: string;
    spaces: Space[];
  } | null;
}

const initialHomeState: HomeState = {
  boards: [],
  teams: [],
  loadingBoards: false,
  invitations: [],
  members: [],
  userInvitations: [],
  currentTeamId: null,
  teamSpaces: null,
};

const reducer = createReducer(
  initialHomeState,
  on(HomeActions.initHome, (state): HomeState => {
    state = {
      ...state,
    };
    state.invitations = [];
    state.members = [];
    state.boards = [];
    state.currentTeamId = null;
    state.teamSpaces = null;

    return state;
  }),
  on(HomeActions.initBoardsPage, (state): HomeState => {
    return {
      ...state,
      boards: [],
      currentTeamId: null,
      teamSpaces: null,
      loadingBoards: true,
    };
  }),
  on(HomeActions.fetchBoardsPage, (state, { teamId, offset }): HomeState => {
    if (!offset) {
      state = {
        ...state,
        loadingBoards: true,
        boards: [],
      };
    }

    return {
      ...state,
      currentTeamId: teamId ?? null,
    };
  }),
  on(HomeActions.fetchBoardsSuccess, (state, { boards }): HomeState => {
    return {
      ...state,
      loadingBoards: false,
      boards: [...state.boards, ...boards],
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
    },
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
          userId: invitation.userId,
          createdAt: invitation.createdAt,
        };
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
    },
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
            return {
              ...team,
              teamMember: {
                ...team.teamMember,
                role,
              },
            };
          }

          return team;
        });
      }

      state.members = state.members.map((member) => {
        if (member.id === memberId) {
          return {
            ...member,
            role,
          };
        }

        return member;
      });

      return state;
    },
  ),
  on(HomeActions.duplicateBoardSuccess, (state, { board }) => {
    return {
      ...state,
      boards: [
        {
          ...board,
          name: board.name + ' (copy)',
        },
        ...state.boards,
      ],
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

    if (state.currentTeamId && state.currentTeamId !== teamId) {
      state.boards = state.boards.filter((board) => {
        return board.id !== id;
      });
    }

    return state;
  }),
  on(HomeActions.fetchTeamSpacesSuccess, (state, { teamId, spaces }) => {
    return {
      ...state,
      teamSpaces: {
        teamId,
        spaces,
      },
    };
  }),
  on(HomeActions.createSpaceSuccess, (state, { space }) => {
    if (!state.teamSpaces) {
      return state;
    }

    return {
      ...state,
      teamSpaces: {
        ...state.teamSpaces,
        spaces: [space, ...state.teamSpaces.spaces],
      },
    };
  }),

  on(HomeActions.updateSpaceSuccess, (state, { space }) => {
    if (!state.teamSpaces) {
      return state;
    }

    return {
      ...state,
      teamSpaces: {
        ...state.teamSpaces,
        spaces: state.teamSpaces.spaces.map((s) => {
          if (s.id === space.id) {
            return space;
          }

          return s;
        }),
      },
    };
  }),
  on(HomeActions.deleteSpaceSuccess, (state, { id }) => {
    if (!state.teamSpaces) {
      return state;
    }

    return {
      ...state,
      teamSpaces: {
        ...state.teamSpaces,
        spaces: state.teamSpaces.spaces.filter((space) => {
          return space.id !== id;
        }),
      },
    };
  }),
);

export const homeFeature = createFeature({
  name: 'home',
  reducer,
  extraSelectors: ({ selectCurrentTeamId, selectTeamSpaces }) => ({
    selectCurrentTeamSpaces: createSelector(
      selectCurrentTeamId,
      selectTeamSpaces,
      (teamId, spaces) => {
        if (!teamId || !spaces || teamId !== spaces.teamId) {
          return [];
        }

        return spaces.spaces;
      },
    ),
  }),
});
