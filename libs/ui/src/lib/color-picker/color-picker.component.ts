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
        ...colorPickerConfig,
        el: this.#el.nativeElement,
        default: this.color() || '',
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
