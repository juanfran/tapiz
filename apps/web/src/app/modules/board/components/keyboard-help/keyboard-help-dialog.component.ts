import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

@Component({
  selector: 'tapiz-keyboard-help-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="header">
      <h2>Keyboard Shortcuts</h2>
      <button type="button" mat-icon-button mat-dialog-close aria-label="Close">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <div class="groups">
        @for (group of shortcutGroups; track group.title) {
          <div class="group">
            <h3>{{ group.title }}</h3>
            <ul>
              @for (shortcut of group.shortcuts; track shortcut.description) {
                <li>
                  <span class="keys">
                    @for (key of shortcut.keys; track key; let last = $last) {
                      <kbd>{{ key }}</kbd>
                      @if (!last) {
                        <span class="separator">+</span>
                      }
                    }
                  </span>
                  <span class="description">{{ shortcut.description }}</span>
                </li>
              }
            </ul>
          </div>
        }
      </div>
    </mat-dialog-content>
  `,
  styleUrl: './keyboard-help-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardHelpDialogComponent {
  readonly shortcutGroups: ShortcutGroup[] = [
    {
      title: 'General',
      shortcuts: [
        { keys: ['?'], description: 'Show this help' },
        { keys: ['Esc'], description: 'Close popup / Deselect' },
        { keys: ['Space'], description: 'Hold to pan' },
        { keys: ['Ctrl', 'A'], description: 'Select all nodes' },
        { keys: ['Ctrl', 'Z'], description: 'Undo' },
        { keys: ['Ctrl', 'Y'], description: 'Redo' },
      ],
    },
    {
      title: 'Creation',
      shortcuts: [
        { keys: ['N'], description: 'New note' },
        { keys: ['T'], description: 'Text mode' },
        { keys: ['P'], description: 'Panel mode' },
        { keys: ['G'], description: 'Group mode' },
        { keys: ['I'], description: 'Image picker' },
      ],
    },
    {
      title: 'Selection & Movement',
      shortcuts: [
        { keys: ['Alt'], description: 'Hold for area select' },
        { keys: ['↑', '↓', '←', '→'], description: 'Move selected nodes' },
        { keys: ['Ctrl', 'H'], description: 'Toggle text visibility' },
      ],
    },
    {
      title: 'Layer Ordering',
      shortcuts: [
        { keys: ['Ctrl', ']'], description: 'Bring forward' },
        { keys: ['Ctrl', '['], description: 'Send backward' },
        { keys: ['Ctrl', 'Shift', ']'], description: 'Bring to front' },
        { keys: ['Ctrl', 'Shift', '['], description: 'Send to back' },
      ],
    },
  ];
}
