import { Note } from './note.model';
import { Group } from './group.model';

export interface Vote {
  ownerId: string;
  targetId: Note['id'] | Group['id'];
}
