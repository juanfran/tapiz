import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  OnDestroy,
  computed,
  NgZone,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

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
        <div class="pad-layer layer-3" [style.background]="layerColor3()"></div>
        <div class="pad-layer layer-2" [style.background]="layerColor2()"></div>
        <div class="pad-layer layer-1" [style.background]="color()"></div>
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
  readonly #document = inject(DOCUMENT);
  readonly #zone = inject(NgZone);

  color = input<string>('#fbb980');
  active = input<boolean>(false);

  /** Emitted when user drags (threshold exceeded) — board boundary check is done by parent */
  dropped = output<NoteDragEvent>();

  /** Emitted when user just clicks without dragging */
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

  layerColor2 = computed(() => this.#darken(this.color(), 12));
  layerColor3 = computed(() => this.#darken(this.color(), 22));

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    this.startX = event.clientX;
    this.startY = event.clientY;
    this.dragStarted = false;

    // Run mouse tracking outside Angular zone to avoid triggering CD on every mousemove
    this.#zone.runOutsideAngular(() => {
      this.#document.addEventListener('mousemove', this.mouseMoveHandler);
      this.#document.addEventListener('mouseup', this.mouseUpHandler);
    });
  }

  #onMouseMove(event: MouseEvent) {
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    if (!this.dragStarted && Math.hypot(dx, dy) > this.dragThreshold) {
      this.dragStarted = true;
      // Re-enter zone for the signal updates that affect the template
      this.#zone.run(() => this.dragging.set(true));
    }

    if (this.dragStarted) {
      // Update ghost position inside zone so Angular detects the change
      this.#zone.run(() => {
        this.ghostX.set(event.clientX - this.ghostSize / 2);
        this.ghostY.set(event.clientY - this.ghostSize / 2);
      });
    }
  }

  #onMouseUp(event: MouseEvent) {
    this.#document.removeEventListener('mousemove', this.mouseMoveHandler);
    this.#document.removeEventListener('mouseup', this.mouseUpHandler);

    this.#zone.run(() => {
      if (this.dragStarted && this.dragging()) {
        this.dragging.set(false);
        // Always emit — the parent (BoardToolbarComponent) decides whether
        // the coordinates land on the board canvas.
        this.dropped.emit({ clientX: event.clientX, clientY: event.clientY });
      } else if (!this.dragStarted) {
        this.clicked.emit();
      }

      this.dragging.set(false);
    });
  }

  ngOnDestroy() {
    this.#document.removeEventListener('mousemove', this.mouseMoveHandler);
    this.#document.removeEventListener('mouseup', this.mouseUpHandler);
  }

  /** Darken a 3- or 6-digit hex color string by reducing each channel by `amount`. */
  #darken(hex: string, amount: number): string {
    // Normalise 3-char shorthand (#abc → #aabbcc)
    const normalized = hex.replace(
      /^#([a-f\d])([a-f\d])([a-f\d])$/i,
      (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`,
    );
    const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
    if (!result) return hex; // graceful fallback for CSS vars / rgb() strings
    const r = Math.max(0, parseInt(result[1], 16) - amount);
    const g = Math.max(0, parseInt(result[2], 16) - amount);
    const b = Math.max(0, parseInt(result[3], 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
