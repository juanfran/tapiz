import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { lighter } from '@tapiz/cdk/utils/colors';

@Component({
  selector: 'tapiz-notes',
  template: `
    <div class="list">
      @for (note of notes; track note.color) {
        <button
          type="button"
          [style.background]="note.lightColor"
          [style.borderColor]="
            noteColor() === note.color ? note.color : 'transparent'
          "
          (click)="selectNote(note.color)"></button>
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
      color: '#fdab61',
    },
    {
      color: '#F44336',
    },
    {
      color: '#E91E63',
    },
    {
      color: '#9C27B0',
    },
    {
      color: '#673AB7',
    },
    {
      color: '#3F51B5',
    },
    {
      color: '#2196F3',
    },
    {
      color: '#03A9F4',
    },
    {
      color: '#00BCD4',
    },
    {
      color: '#009688',
    },
    {
      color: '#4CAF50',
    },
    {
      color: '#8BC34A',
    },
    {
      color: '#CDDC39',
    },
    {
      color: '#FFEB3B',
    },
    {
      color: '#FFC107',
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
