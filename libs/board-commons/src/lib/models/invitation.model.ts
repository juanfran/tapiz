import { BoardUser } from './board.model.js';
import { Team } from './team.model.js';

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
  board?: BoardUser;
}
