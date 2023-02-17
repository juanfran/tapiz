import {
  Component,
  ChangeDetectionStrategy,
  HostBinding,
  ElementRef,
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
})
export class OverlayComponent {
  @HostBinding('style.display') get display() {
    return this.state.get('highlight') ? 'block' : 'none';
  }

  constructor(
    private el: ElementRef,
    private state: RxState<State>,
    private store: Store
  ) {
    this.state.connect('highlight', this.store.select(isUserHighlighActive()));
  }
}
