import {
  Component,
  ChangeDetectionStrategy,
  HostBinding,
  ElementRef,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { isUserHighlighActive } from '../../selectors/page.selectors';

interface State {
  highlight: boolean;
}

@Component({
  selector: 'team-up-overlay',
  templateUrl: './overlay.component.html',
  styleUrls: ['./overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
})
export class OverlayComponent {
  private el = inject(ElementRef);
  private state = inject<RxState<State>>(RxState<State>);
  private store = inject(Store);

  @HostBinding('style.display') get display() {
    return this.state.get('highlight') ? 'block' : 'none';
  }

  constructor() {
    this.state.connect('highlight', this.store.select(isUserHighlighActive()));
  }
}
