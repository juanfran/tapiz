import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { selectName } from '../../selectors/board.selectors';
import {
  selectCanvasMode,
  selectIsOwner,
} from '../../selectors/page.selectors';
import { ExportService } from '../../services/export.service';

interface State {
  edit: boolean;
  canvasMode: string;
  name: string;
  isOwner: boolean;
}
@Component({
  selector: 'team-up-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class HeaderComponent {
  constructor(
    private exportService: ExportService,
    private store: Store,
    public state: RxState<State>,
    public cd: ChangeDetectorRef
  ) {
    this.state.set({ edit: false });
    this.state.connect('canvasMode', this.store.select(selectCanvasMode));
    this.state.connect('name', this.store.select(selectName));
    this.state.connect('isOwner', this.store.select(selectIsOwner));
  }

  public model$ = this.state.select();

  public changeCanvasMode(mode: string) {
    this.store.dispatch(
      PageActions.changeCanvasMode({
        canvasMode: mode,
      })
    );
  }

  public export() {
    this.exportService.getExportFile().then(
      (url) => {
        window.location.href = url;
      },
      () => {
        console.error('export error');
      }
    );
  }

  public editName() {
    this.state.set({ edit: true });
  }

  public enter(event: Event) {
    event.preventDefault();

    if (event.target) {
      this.state.set({ edit: false });

      const name = (event.target as HTMLTextAreaElement).innerText;
      this.store.dispatch(BoardActions.setBoardName({ name }));
    }
  }

  public clickOutside({ el }: { el: ElementRef }) {
    this.state.set({ edit: false });

    const name = (el.nativeElement as HTMLTextAreaElement).innerText;
    this.store.dispatch(BoardActions.setBoardName({ name }));
  }
}
