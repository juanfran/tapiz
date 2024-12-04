import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  imports: [],
  styles: [':host {display: none; }'],
})
export class TitleComponent {
  private titleService = inject(Title);

  prefix = input('Tapiz -');

  title = input.required<string>();

  constructor() {
    effect(() => {
      this.titleService.setTitle(`${this.prefix()} ${this.title()}`);
    });
  }
}
