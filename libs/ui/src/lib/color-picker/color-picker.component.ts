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
import { colorPickerConfig } from './color-picker.config';

@Component({
  selector: 'tapiz-color-picker',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerComponent implements OnDestroy {
  #el = inject(ElementRef);
  pickr?: Pickr;

  color = input<string>();
  changed = output<string | undefined>();
  mode = input<'HEX' | 'RGBA' | 'HSL' | 'HSVA'>('HEX');

  constructor() {
    afterNextRender(() => {
      this.pickr = Pickr.create({
        ...colorPickerConfig,
        el: this.#el.nativeElement,
        default: this.color() || '',
        components: {
          preview: true,
          opacity: true,
          hue: true,
          interaction: {
            hex: true,
            rgba: true,
            hsla: true,
            hsva: true,
            cmyk: true,
            input: true,
            clear: true,
            save: false,
          },
        },
      });

      this.pickr.on('clear', () => {
        this.changed.emit(undefined);
        this.pickr?.hide();
      });

      this.pickr.on('change', (color: Pickr.HSVaColor | null) => {
        if (this.mode() === 'HEX') {
          this.changed.emit(color?.toHEXA().toString() ?? undefined);
        } else if (this.mode() === 'RGBA') {
          this.changed.emit(color?.toRGBA().toString() ?? undefined);
        } else if (this.mode() === 'HSL') {
          this.changed.emit(color?.toHSLA().toString() ?? undefined);
        } else if (this.mode() === 'HSVA') {
          this.changed.emit(color?.toHSVA().toString() ?? undefined);
        }
      });
    });

    effect(() => {
      const color = this.color();
      this.pickr?.setColor(color || '');
    });
  }

  ngOnDestroy() {
    this.pickr?.destroyAndRemove();
  }
}
