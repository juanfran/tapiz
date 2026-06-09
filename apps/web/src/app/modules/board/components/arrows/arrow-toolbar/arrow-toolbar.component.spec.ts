import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BoardTuNode, TuNode } from '@tapiz/board-commons';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardFacade } from '../../../../../services/board-facade.service';
import { BoardPageActions } from '../../../actions/board-page.actions';
import { BoardActions } from '../../../actions/board.actions';
import { boardPageFeature } from '../../../reducers/boardPage.reducer';
import { NodesActions } from '../../../services/nodes-actions';
import { SelectAction, ZoneService } from '../../zone/zone.service';
import { ArrowToolbarComponent } from './arrow-toolbar.component';

describe('ArrowToolbarComponent', () => {
  let area$: Subject<SelectAction | null>;
  let dispatch: ReturnType<typeof vi.fn>;
  let tmpNode: ReturnType<typeof signal<BoardTuNode | null>>;

  beforeEach(() => {
    area$ = new Subject<SelectAction | null>();
    dispatch = vi.fn();
    tmpNode = signal<BoardTuNode | null>(null);

    const nodes = signal<TuNode[]>([]);
    const boardMode = signal(0);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: Store,
          useValue: {
            dispatch,
            selectSignal: (selector: unknown) => {
              if (selector === boardPageFeature.selectBoardMode) {
                return boardMode;
              }

              return signal(null);
            },
          },
        },
        {
          provide: BoardFacade,
          useValue: {
            nodes,
            focusNodes: () => [],
            filterBoardNodes: () => [],
            tmpNode,
          },
        },
        {
          provide: NodesActions,
          useValue: {
            add: vi.fn((type: string, content: unknown) => ({
              data: {
                id: 'new-arrow',
                type,
                content,
              },
              op: 'add' as const,
              position: 0,
            })),
          },
        },
        {
          provide: ZoneService,
          useValue: {
            selectArea: vi.fn(() => area$.asObservable()),
          },
        },
      ],
    });
  });

  it('keeps the arrow popup open after committing a drawn arrow', () => {
    TestBed.runInInjectionContext(() => new ArrowToolbarComponent());

    area$.next(selectAction({ x: 0, y: 0 }, { x: 30, y: 0 }));
    area$.complete();

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: BoardActions.batchNodeActions.type,
        history: true,
      }),
    );
    expect(tmpNode()).toBeNull();
    expect(dispatch).not.toHaveBeenCalledWith(
      BoardPageActions.setPopupOpen({ popup: '' }),
    );
  });

  it('closes the arrow popup when cancelling a draft', () => {
    TestBed.runInInjectionContext(() => new ArrowToolbarComponent());

    area$.next(selectAction({ x: 0, y: 0 }, { x: 30, y: 0 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(tmpNode()).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(
      BoardPageActions.setPopupOpen({ popup: '' }),
    );
  });

  it('closes the arrow popup after a draft that does not create an arrow', () => {
    TestBed.runInInjectionContext(() => new ArrowToolbarComponent());

    area$.next(selectAction({ x: 0, y: 0 }, { x: 2, y: 0 }));
    area$.complete();

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: BoardActions.batchNodeActions.type,
      }),
    );
    expect(tmpNode()).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(
      BoardPageActions.setPopupOpen({ popup: '' }),
    );
  });
});

function selectAction(
  position: { x: number; y: number },
  mousePosition = position,
) {
  return {
    userId: 'user-1',
    style: 'invisible',
    position,
    mousePosition,
    size: { width: 0, height: 0 },
    relativeRect: {} as DOMRect,
    layer: 0,
  } satisfies SelectAction;
}
