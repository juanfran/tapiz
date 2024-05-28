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
  standalone: true,
})
export class ColorPickerComponent implements OnDestroy {
  #el = inject(ElementRef);
  #pickr?: Pickr;

  color = input<string>();
  change = output<string | undefined>();
  mode = input<'HEX' | 'RGBA' | 'HSL' | 'HSVA'>('HEX');

  constructor() {
    afterNextRender(() => {
      this.#pickr = Pickr.create({
        ...colorPickerConfig,
        el: this.#el.nativeElement,
        default: this.color() || '',
      });

      this.#pickr.on('save', (color: Pickr.HSVaColor | null) => {
        if (this.mode() === 'HEX') {
          this.change.emit(color?.toHEXA().toString() ?? undefined);
        } else if (this.mode() === 'RGBA') {
          this.change.emit(color?.toRGBA().toString() ?? undefined);
        } else if (this.mode() === 'HSL') {
          this.change.emit(color?.toHSLA().toString() ?? undefined);
        } else if (this.mode() === 'HSVA') {
          this.change.emit(color?.toHSVA().toString() ?? undefined);
        }

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
