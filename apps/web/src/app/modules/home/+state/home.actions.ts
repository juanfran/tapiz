import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  BoardUser,
  Invitation,
  Team,
  TeamInvitation,
  UserTeam,
  UserInvitation,
  TeamMember,
  Member,
  SortBoard,
} from '@tapiz/board-commons';

export const HomeActions = createActionGroup({
  source: 'Home',
  events: {
    'Init home': emptyProps(),
    'Init all boards page': emptyProps(),
    'Fetch all boards': emptyProps(),
    'Fetch team boards': props<{ teamId: Team['id'] }>(),
    'Fetch boards success': props<{ boards: BoardUser[] }>(),
    'Remove board': props<{ id: BoardUser['id'] }>(),
    'Leave board': props<{ id: BoardUser['id'] }>(),
    'Create board': props<{ name: string; teamId?: Team['id'] }>(),
    'Duplicate board': props<{ id: BoardUser['id'] }>(),
    'Duplicate board success': props<{ board: BoardUser }>(),
    'Remove account': emptyProps(),
    'Fetch teams': emptyProps(),
    'Fetch teams success': props<{ teams: UserTeam[] }>(),
    'Create team': props<{ name: string }>(),
    'Create team success': props<{ team: UserTeam }>(),
    'Delete team': props<{ id: UserTeam['id'] }>(),
    'Delete team success': props<{ id: UserTeam['id'] }>(),
    'Invite to team': props<{
      id: Team['id'];
      invitation: {
        email: string;
        role: UserTeam['teamMember']['role'];
      };
    }>(),
    'Invite to team success': props<{
      id: Team['id'];
      invitation: Invitation;
    }>(),
    'Init team page': props<{ teamId: Team['id'] }>(),
    'Init team members modal': props<{ teamId: Team['id'] }>(),
    'Fetch teams invitations success': props<{
      invitations: TeamInvitation[];
    }>(),
    'Fetch team members success': props<{ members: TeamMember[] }>(),
    'Delete team invitation': props<{ id: Invitation['id'] }>(),
    'Rename team': props<{ id: Team['id']; name: string }>(),
    'Fetch user invitations success': props<{
      invitations: UserInvitation[];
    }>(),
    'Accept invitation': props<{
      invitation: UserInvitation;
    }>(),
    'Accept invitation success': props<{
      invitation: UserInvitation;
    }>(),
    'Reject invitation': props<{
      invitation: UserInvitation;
    }>(),
    'Leave team': props<{ id: Team['id'] }>(),
    'Delete team member': props<{ id: TeamMember['id']; teamId: Team['id'] }>(),
    'Delete team member success': props<{
      id: TeamMember['id'];
      currentUserId: Member['id'];
      teamId: Team['id'];
    }>(),
    'Change role': props<{
      memberId: TeamMember['id'];
      role: TeamMember['role'];
      teamId: Team['id'];
    }>(),
    'Change role success': props<{
      memberId: TeamMember['id'];
      role: TeamMember['role'];
      teamId: Team['id'];
      currentUserId: TeamMember['id'];
    }>(),
    'Change invitation role': props<{
      id: Invitation['id'];
      role: TeamMember['role'];
    }>(),
    'Change invitation role success': props<{
      id: Invitation['id'];
      role: TeamMember['role'];
    }>(),
    'Rename board': props<{ id: BoardUser['id']; name: string }>(),
    'Star board': props<{ id: BoardUser['id'] }>(),
    'Unstar board': props<{ id: BoardUser['id'] }>(),
    'Init starred page': emptyProps(),
    'Change board sort by': props<{ sortBy: SortBoard }>(),
    'Transfer board': props<{
      id: BoardUser['id'];
      teamId: Team['id'] | null;
    }>(),
    'User event': emptyProps(),
  },
});
