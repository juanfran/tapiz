import { Board } from './board.model.js';

export interface Space {
  id: string;
  teamId: string;
  name: string;
  boards: Board[];
}
