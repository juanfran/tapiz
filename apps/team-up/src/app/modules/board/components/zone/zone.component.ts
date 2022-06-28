import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostBinding,
  ElementRef,
  ApplicationRef,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Zone, ZoneConfig } from '@team-up/board-commons';
import { Subscription } from 'rxjs';
import {
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  takeWhile,
  withLatestFrom,
} from 'rxjs/operators';
import {
  setMoveEnabled,
  setZone,
  zoneToGroup,
  setPopupOpen,
  zoneToPanel,
} from '../../actions/board.actions';
import {
  selectPosition,
  selectInitZone,
  selectZone,
  selectZoom,
} from '../../selectors/board.selectors';
import { BoardMoveService } from '../../services/board-move.service';

interface State {
  zone: Zone | null;
  config: ZoneConfig | null;
}
@UntilDestroy()
@Component({
  selector: 'team-up-zone',
  template: '',
  styleUrls: ['./zone.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class ZoneComponent {
  @HostBinding('style.display') get display() {
    return this.zone ? 'block' : 'none';
  }

  @HostBinding('class.group') get group() {
    return this.state.get('config')?.type === 'group';
  }

  @HostBinding('class.panel') get panel() {
    return this.state.get('config')?.type === 'panel';
  }

  @HostBinding('style.transform') get transform() {
    return this.zone
      ? `translate(${this.zone.position.x}px, ${this.zone.position.y}px)`
      : '';
  }

  @HostBinding('style.width.px') get width() {
    return this.zone?.width;
  }

  @HostBinding('style.height.px') get height() {
    return this.zone?.height;
  }

  public get zone() {
    return this.state.get('zone');
  }

  public nextClickSubscription?: Subscription;

  constructor(
    private appRef: ApplicationRef,
    private el: ElementRef,
    private store: Store,
    private state: RxState<State>,
    private cdRef: ChangeDetectorRef,
    private boardMoveService: BoardMoveService
  ) {
    const initZone$ = this.store
      .select(selectInitZone)
      .pipe(filter((it) => !!it));
    this.state.hold(initZone$, () => this.captureNextClick());

    // unsubscribe from next click if the toolbar change
    this.state.hold(
      this.store.select(selectInitZone).pipe(filter((it) => !it)),
      () => {
        if (this.nextClickSubscription) {
          this.nextClickSubscription.unsubscribe();
        }
      }
    );

    this.state.connect('zone', this.store.select(selectZone));
    this.state.connect('config', this.store.select(selectInitZone));
    this.state.hold(this.state.select(), () => this.cdRef.markForCheck());
  }

  public captureNextClick() {
    this.nextClickSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition)
        ),
        switchMap(([mouseDownEvent, zoom, position]) => {
          this.store.dispatch(setMoveEnabled({ enabled: false }));

          return this.boardMoveService.mouseMove$.pipe(
            takeUntil(this.boardMoveService.mouseUp$),
            map((mouseMoveEvent) => {
              return {
                width: (mouseMoveEvent.x - mouseDownEvent.clientX) / zoom,
                height: (mouseMoveEvent.y - mouseDownEvent.clientY) / zoom,
              };
            }),
            map((size) => {
              return {
                ...size,
                position: {
                  x: (-position.x + mouseDownEvent.clientX) / zoom,
                  y: (-position.y + mouseDownEvent.clientY) / zoom,
                },
              };
            }),
            startWith({
              width: 0,
              height: 0,
              position: {
                x: (-position.x + mouseDownEvent.clientX) / zoom,
                y: (-position.y + mouseDownEvent.clientY) / zoom,
              },
            })
          );
        })
      )
      .subscribe({
        next: (zone) => {
          this.store.dispatch(
            setZone({
              zone,
            })
          );
          this.appRef.tick();
        },
        complete: () => {
          this.store.dispatch(setPopupOpen({ popup: '' }));

          if (this.state.get('config')?.type === 'group') {
            this.store.dispatch(zoneToGroup());
          } else if (this.state.get('config')?.type === 'panel') {
            this.store.dispatch(zoneToPanel());
          }
        },
      });
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement as HTMLElement;
  }
}
