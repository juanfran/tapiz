import { Board } from './board.model';
import { Team } from './team.model';

export interface Invitation {
  id: string;
  userId?: string;
  email?: string;
  role: 'admin' | 'member' | 'guest';
}

export interface UserInvitation {
  id: string;
  role: 'admin' | 'member' | 'guest';
  team?: Team;
  board?: Board;
}
