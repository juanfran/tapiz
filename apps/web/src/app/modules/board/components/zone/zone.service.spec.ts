import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BoardTuNode, TuNode } from '@tapiz/board-commons';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardMoveService } from '../../services/board-move.service';
import { ZoneService } from './zone.service';

describe('ZoneService', () => {
  let nodes: ReturnType<typeof signal<TuNode[]>>;
  let service: ZoneService;

  beforeEach(() => {
    nodes = signal<TuNode[]>([]);
    document.body.replaceChildren();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: Store,
          useValue: {
            dispatch: vi.fn(),
            select: vi.fn(),
            selectSignal: (selector: unknown) => {
              if (selector === boardPageFeature.selectMoveEnabled) {
                return signal(true);
              }

              return signal(null);
            },
          },
        },
        {
          provide: BoardFacade,
          useValue: {
            get: () => nodes(),
          },
        },
        {
          provide: BoardMoveService,
          useValue: {},
        },
      ],
    });

    service = TestBed.inject(ZoneService);
  });

  it('selects visible notes in participate mode even when their stored layer is not the board mode', () => {
    nodes.set([
      node('note-layer-0', 0),
      node('note-layer-2', 2),
      node('panel-layer-1', 1),
    ]);

    addNodeElement('note-layer-0', rect(10, 10, 100, 100));
    addNodeElement('note-layer-2', rect(120, 10, 100, 100));
    addNodeElement('panel-layer-1', rect(230, 10, 100, 100));

    expect(
      service.nodesInZone({
        relativeRect: rect(0, 0, 400, 200),
        layer: 0,
      }),
    ).toEqual(['note-layer-0', 'note-layer-2']);
  });

  it('selects edit-layer nodes in edit mode without selecting participant-layer nodes', () => {
    nodes.set([
      node('note-layer-0', 0),
      node('panel-layer-1', 1),
      node('note-layer-2', 2),
    ]);

    addNodeElement('note-layer-0', rect(10, 10, 100, 100));
    addNodeElement('panel-layer-1', rect(120, 10, 100, 100));
    addNodeElement('note-layer-2', rect(230, 10, 100, 100));

    expect(
      service.nodesInZone({
        relativeRect: rect(0, 0, 400, 200),
        layer: 1,
      }),
    ).toEqual(['panel-layer-1', 'note-layer-2']);
  });
});

function node(id: string, layer: number): BoardTuNode {
  return {
    id,
    type: 'note',
    content: {
      position: {
        x: 0,
        y: 0,
      },
      layer,
      width: 100,
      height: 100,
    },
  } as BoardTuNode;
}

function addNodeElement(id: string, domRect: DOMRect) {
  const element = document.createElement('tapiz-node');
  element.dataset['id'] = id;
  element.getBoundingClientRect = () => domRect;
  document.body.appendChild(element);
}

function rect(x: number, y: number, width: number, height: number) {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  } as DOMRect;
}
