import { StateActions } from '@team-up/board-commons';

export interface SyncNodeBoxOptions {
  history?: number;
  log?: boolean;
}

export interface SyncNodeBoxHistory {
  past: StateActions[][];
  future: StateActions[][];
}
