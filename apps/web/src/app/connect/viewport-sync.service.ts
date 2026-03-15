import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { createClient } from '@connectrpc/connect';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConnectTransportService } from './transport.service';
import { LocalStorageService } from './local-storage.service';
import { BoardService } from '@tapiz/proto/tapiz/v1/board_pb';

interface Viewport {
  center: { x: number; y: number };
  width: number;
  height: number;
  zoom: number;
}

interface SpatialMeta {
  nodeId: string;
  bounds: {
    topLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
  layer: number;
}

@Injectable({ providedIn: 'root' })
export class ViewportSyncService implements OnDestroy {
  readonly #transport = inject(ConnectTransportService);
  readonly #storage = inject(LocalStorageService);

  readonly #viewportSubject = new Subject<{
    boardId: string;
    viewport: Viewport;
  }>();
  readonly #abortController = signal<AbortController | null>(null);

  readonly offscreenIndex = signal<SpatialMeta[]>([]);
  readonly syncedNodes = signal<unknown[]>([]);
  readonly version = signal<bigint>(0n);

  constructor() {
    this.#viewportSubject
      .pipe(
        takeUntilDestroyed(),
        debounceTime(150),
        distinctUntilChanged(
          (a, b) =>
            a.boardId === b.boardId &&
            a.viewport.center.x === b.viewport.center.x &&
            a.viewport.center.y === b.viewport.center.y &&
            a.viewport.zoom === b.viewport.zoom,
        ),
      )
      .subscribe(({ boardId, viewport }) => {
        this.#fetchViewportNodes(boardId, viewport);
      });
  }

  updateViewport(boardId: string, viewport: Viewport): void {
    this.#viewportSubject.next({ boardId, viewport });
  }

  async #fetchViewportNodes(
    boardId: string,
    viewport: Viewport,
  ): Promise<void> {
    this.#abortController()?.abort();
    const controller = new AbortController();
    this.#abortController.set(controller);

    const client = createClient(BoardService, this.#transport.transport);

    try {
      for await (const response of client.syncViewportNodes(
        {
          boardId,
          viewport: {
            center: { x: viewport.center.x, y: viewport.center.y },
            width: viewport.width,
            height: viewport.height,
            zoom: viewport.zoom,
          },
        },
        { signal: controller.signal },
      )) {
        this.syncedNodes.set(response.nodes);
        this.offscreenIndex.set(
          response.offscreenIndex.map((m) => ({
            nodeId: m.nodeId,
            bounds: {
              topLeft: {
                x: m.bounds?.topLeft?.x ?? 0,
                y: m.bounds?.topLeft?.y ?? 0,
              },
              bottomRight: {
                x: m.bounds?.bottomRight?.x ?? 0,
                y: m.bounds?.bottomRight?.y ?? 0,
              },
            },
            layer: m.layer,
          })),
        );
        this.version.set(response.version);

        await this.#storage.put(
          `spatial-index:${boardId}`,
          response.offscreenIndex,
        );
      }
    } catch {
      // Stream cancelled or error
    }
  }

  async loadColdNode(boardId: string, nodeId: string): Promise<unknown | null> {
    const cached = await this.#storage.get(`node:${boardId}:${nodeId}`);
    if (cached) return cached;

    const client = createClient(BoardService, this.#transport.transport);
    try {
      const result = await client.getNode({ boardId, nodeId });
      if (result.node) {
        await this.#storage.put(`node:${boardId}:${nodeId}`, result.node);
      }
      return result.node ?? null;
    } catch {
      return null;
    }
  }

  ngOnDestroy(): void {
    this.#abortController()?.abort();
  }
}
