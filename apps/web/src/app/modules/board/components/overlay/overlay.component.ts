import {
  Component,
  ChangeDetectionStrategy,
  HostBinding,
  ElementRef,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

interface State {
  highlight: boolean;
}

@Component({
  selector: 'tapiz-overlay',
  templateUrl: './overlay.component.html',
  styleUrls: ['./overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class OverlayComponent {
  private el = inject(ElementRef);
  private state = inject<RxState<State>>(RxState<State>);
  private store = inject(Store);

  @HostBinding('style.display') get display() {
    return this.state.get('highlight') ? 'block' : 'none';
  }

  constructor() {
    this.state.connect(
      'highlight',
      this.store.select(boardPageFeature.isUserHighlighActive),
    );
  }
}
