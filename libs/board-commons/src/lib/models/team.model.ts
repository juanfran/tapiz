import { Member } from './member.model';

export interface Team {
  id: string;
  name: string;
}

export interface UserTeam extends Team {
  teamMember: {
    role: 'admin' | 'member';
  };
}

export interface TeamMember extends Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface TeamInvitation {
  id: string;
  userId: string | null;
  email: string | null;
  role: 'admin' | 'member';
  teamId: string;
  createdAt: string;
}
