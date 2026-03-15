import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  OnDestroy,
  computed,
} from '@angular/core';

export interface NoteDragEvent {
  clientX: number;
  clientY: number;
}

@Component({
  selector: 'tapiz-sticky-note-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pad-wrapper"
      [title]="'Sticky Notes (N) — click to place, drag to drop'"
      (mousedown)="onMouseDown($event)">
      <div class="pad-stack">
        <div
          class="pad-layer layer-3"
          [style.background]="layerColor3()"></div>
        <div
          class="pad-layer layer-2"
          [style.background]="layerColor2()"></div>
        <div
          class="pad-layer layer-1"
          [style.background]="color()"></div>
      </div>
      <span class="pad-key">N</span>
    </div>

    @if (dragging()) {
      <div
        class="ghost-note"
        [style.left.px]="ghostX()"
        [style.top.px]="ghostY()"
        [style.background]="color()"
        [style.width.px]="ghostSize"
        [style.height.px]="ghostSize">
        <div class="ghost-fold"></div>
      </div>
    }
  `,
  styleUrl: './sticky-note-pad.component.scss',
  host: {
    '[class.active]': 'active()',
  },
})
export class StickyNotePadComponent implements OnDestroy {
  color = input<string>('#fbb980');
  active = input<boolean>(false);

  /** Emitted when user drags the pad onto the board – provides screen coords */
  dropped = output<NoteDragEvent>();

  /** Emitted when user just clicks (no significant drag) */
  clicked = output<void>();

  readonly ghostSize = 140;
  private readonly dragThreshold = 8;

  dragging = signal(false);
  ghostX = signal(0);
  ghostY = signal(0);

  private startX = 0;
  private startY = 0;
  private dragStarted = false;

  private readonly mouseMoveHandler = (e: MouseEvent) => this.#onMouseMove(e);
  private readonly mouseUpHandler = (e: MouseEvent) => this.#onMouseUp(e);

  // Slightly darkened variants for the "layers" beneath the top note
  layerColor2 = computed(() => this.#darken(this.color(), 12));
  layerColor3 = computed(() => this.#darken(this.color(), 22));

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    this.startX = event.clientX;
    this.startY = event.clientY;
    this.dragStarted = false;

    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
  }

  #onMouseMove(event: MouseEvent) {
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    if (!this.dragStarted && Math.hypot(dx, dy) > this.dragThreshold) {
      this.dragStarted = true;
      this.dragging.set(true);
    }

    if (this.dragStarted) {
      this.ghostX.set(event.clientX - this.ghostSize / 2);
      this.ghostY.set(event.clientY - this.ghostSize / 2);
    }
  }

  #onMouseUp(event: MouseEvent) {
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);

    if (this.dragStarted && this.dragging()) {
      this.dragging.set(false);

      // Only emit drop if the cursor ended up on the board canvas
      const boardEl = document.querySelector(
        'tapiz-board',
      ) as HTMLElement | null;
      if (boardEl) {
        const rect = boardEl.getBoundingClientRect();
        const insideBoard =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;

        if (insideBoard) {
          this.dropped.emit({ clientX: event.clientX, clientY: event.clientY });
          return;
        }
      }
    } else if (!this.dragStarted) {
      // Simple click — activate click-to-place mode
      this.clicked.emit();
    }

    this.dragging.set(false);
  }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
  }

  #darken(hex: string, amount: number): string {
    // Parse hex color and darken by reducing each channel
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    const r = Math.max(0, parseInt(result[1], 16) - amount);
    const g = Math.max(0, parseInt(result[2], 16) - amount);
    const b = Math.max(0, parseInt(result[3], 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
