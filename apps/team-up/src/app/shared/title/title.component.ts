import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Input,
} from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'team-up-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  standalone: true,
  imports: [],
  styles: [':host {display: none; }'],
})
export class TitleComponent {
  private titleService = inject(Title);

  @Input()
  public prefix = 'TeamUp -';

  @Input({ required: true })
  public set title(title: string) {
    this.titleService.setTitle(`${this.prefix} ${title}`);
  }
}
