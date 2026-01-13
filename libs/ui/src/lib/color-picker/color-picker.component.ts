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
  disabled = input<boolean>(false);

  constructor() {
    afterNextRender(() => {
      const container = document.querySelector('mat-dialog-container')
        ? 'mat-dialog-container'
        : 'body';

      this.pickr = Pickr.create({
        ...colorPickerConfig,
        el: this.#el.nativeElement,
        default: this.color() || '',
        container,
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

      if (this.disabled()) {
        this.pickr.disable();
      }

      this.pickr.on('clear', () => {
        if (this.disabled()) {
          return;
        }
        this.changed.emit(undefined);
        this.pickr?.hide();
      });

      this.pickr.on('change', (color: Pickr.HSVaColor | null) => {
        if (this.disabled()) {
          return;
        }

        if (this.mode() === 'HEX') {
          this.changed.emit(color?.toHEXA().toString() ?? undefined);
        } else if (this.mode() === 'RGBA') {
          const rgba = color?.toRGBA();

          if (!rgba) {
            this.changed.emit(undefined);
            return;
          }

          rgba[0] = Math.trunc(rgba[0]);
          rgba[1] = Math.trunc(rgba[1]);
          rgba[2] = Math.trunc(rgba[2]);
          rgba[3] = Math.trunc(rgba[3]);

          this.changed.emit(rgba.toString() ?? undefined);
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

    effect(() => {
      const isDisabled = this.disabled();
      if (this.pickr) {
        if (isDisabled) {
          this.pickr.disable();
        } else {
          this.pickr.enable();
        }
      }
    });
  }

  ngOnDestroy() {
    this.pickr?.destroyAndRemove();
  }
}
