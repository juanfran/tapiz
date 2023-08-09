1;
export interface Board {
  name: string;
  id: string;
  createdAt: string;
  teamId: string | null;
  role: 'admin' | 'member' | 'guest';
  starred: boolean;
  lastAccessedAt: string;
}
