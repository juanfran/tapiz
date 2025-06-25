import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ContextMenuItem, ContextMenuStore } from './context-menu.store';
import { ClickOutside } from 'ngxtension/click-outside';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tapiz-context-menu',
  template: `<div
    class="menu"
    [style.transform]="position()"
    (clickOutside)="contextMenuStore.close()"
    [class.open]="
      contextMenuStore.state.open() && contextMenuStore.state.items().length
    ">
    @for (item of contextMenuStore.state.items(); track $index) {
      <button
        class="item"
        (click)="action($event, item)">
        @if (item.icon) {
          <mat-icon>{{ item.icon }}</mat-icon>
        }
        <div class="label">{{ item.label }}</div>
        @if (item.help) {
          <div class="help">{{ item.help }}</div>
        }
      </button>
    }
  </div>`,
  styleUrls: ['./context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClickOutside, MatIconModule],
})
export class ContextMenuComponent {
  contextMenuStore = inject(ContextMenuStore);

  position = computed(() => {
    const { x, y } = this.contextMenuStore.state.position() ?? { x: 0, y: 0 };

    return `translate(${x}px, ${y}px)`;
  });

  action(event: MouseEvent, item: ContextMenuItem) {
    item.action(event);
    this.contextMenuStore.close();
  }
}
