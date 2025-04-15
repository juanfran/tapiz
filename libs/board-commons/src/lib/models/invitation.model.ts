import { BoardUser } from './board.model.js';
import { Team } from './team.model.js';

export interface Invitation {
  id: string;
  userId: string | null;
  email: string | null;
  role: 'admin' | 'member' | 'guest';
  createdAt: string;
}

export interface UserInvitation {
  id: string;
  role: 'admin' | 'member' | 'guest';
  team?: Team;
  board?: BoardUser;
}
