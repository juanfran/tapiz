import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { lighter } from '@tapiz/cdk/utils/colors';

@Component({
  selector: 'tapiz-notes',
  template: `
    <div class="list">
      @for (note of notes; track note.color) {
        <div>
          <button
            type="button"
            [style.background]="note.color"
            [style.borderColor]="
              note.color === noteColor() ? 'var(--grey-90)' : note.lightColor
            "
            (click)="selectNote(note.color)"></button>
        </div>
      }
    </div>
  `,
  styleUrl: './notes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesComponent {
  noteColor = model<string>('');

  notes = [
    {
      color: '#a6caf4',
    },
    {
      color: '#d6b4ea',
    },
    {
      color: '#92d1b2',
    },
    {
      color: '#ffa4ac',
    },
    {
      color: '#a8d672',
    },
    {
      color: '#fbb980',
    },
    {
      color: '#cfd45f',
    },
    {
      color: '#f7d44c',
    },
  ].map((note) => {
    return {
      ...note,
      lightColor: lighter(note.color, 70),
    };
  });

  selectNote(color: string) {
    this.noteColor.set(color);
  }
}
