import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ElementRef,
  input,
  output,
  OnDestroy,
  afterNextRender,
  effect,
} from '@angular/core';
import Pickr from '@simonwep/pickr';

@Component({
  selector: 'team-up-color-picker',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ColorPickerComponent implements OnDestroy {
  #el = inject(ElementRef);
  #pickr?: Pickr;

  color = input<string>();
  change = output<string | undefined>();

  constructor() {
    afterNextRender(() => {
      this.#pickr = Pickr.create({
        el: this.#el.nativeElement,
        theme: 'monolith',
        default: this.color() || '',
        swatches: [
          'rgba(244, 67, 54, 1)',
          'rgba(233, 30, 99, 1)',
          'rgba(156, 39, 176, 1)',
          'rgba(103, 58, 183, 1)',
          'rgba(63, 81, 181, 1)',
          'rgba(33, 150, 243, 1)',
          'rgba(3, 169, 244, 1)',
          'rgba(0, 188, 212, 1)',
          'rgba(0, 150, 136, 1)',
          'rgba(76, 175, 80, 1)',
          'rgba(139, 195, 74, 1)',
          'rgba(205, 220, 57, 1)',
          'rgba(255, 235, 59, 1)',
          'rgba(255, 193, 7, 1)',
        ],
        components: {
          preview: true,
          opacity: true,
          hue: true,
          interaction: {
            hex: true,
            rgba: true,
            hsla: true,
            hsva: true,
            input: true,
            clear: true,
            save: true,
          },
        },
      });

      this.#pickr.on('save', (color: Pickr.HSVaColor | null) => {
        this.change.emit(color?.toHEXA().toString() ?? undefined);
        this.#pickr?.hide();
      });
    });

    effect(() => {
      this.#pickr?.setColor(this.color() || '');
    });
  }

  ngOnDestroy() {
    this.#pickr?.destroy();
  }
}
