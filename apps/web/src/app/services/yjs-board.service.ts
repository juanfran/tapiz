import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { StateActions, TuNode } from '@tapiz/board-commons';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class YjsBoardService implements OnDestroy {
  readonly #config = inject(ConfigService);

  #doc: Y.Doc | null = null;
  #wsProvider: WebsocketProvider | null = null;
  #idbProvider: IndexeddbPersistence | null = null;
  #observers: (() => void)[] = [];

  readonly #nodesSignal = signal<TuNode[]>([]);
  readonly #connected = signal(false);
  readonly #synced = signal(false);

  readonly nodes = this.#nodesSignal.asReadonly();
  readonly connected = this.#connected.asReadonly();
  readonly synced = this.#synced.asReadonly();

  readonly awarenessStates = signal<Map<number, Record<string, unknown>>>(
    new Map(),
  );

  get doc(): Y.Doc | null {
    return this.#doc;
  }

  get awareness() {
    return this.#wsProvider?.awareness ?? null;
  }

  connect(boardId: string, userId: string): void {
    this.disconnect();

    this.#doc = new Y.Doc();
    const nodesArray = this.#doc.getArray<Y.Map<unknown>>('nodes');

    // Sync nodes array → signal
    const updateSignal = () => {
      this.#nodesSignal.set(this.#yArrayToNodes(nodesArray));
    };

    nodesArray.observe(updateSignal);
    this.#observers.push(() => nodesArray.unobserve(updateSignal));

    // WebSocket Provider
    const wsUrl = this.#config.config.WS_URL.replace(/^http/, 'ws');
    this.#wsProvider = new WebsocketProvider(wsUrl, boardId, this.#doc, {
      connect: true,
    });

    this.#wsProvider.on('status', ({ status }: { status: string }) => {
      this.#connected.set(status === 'connected');
    });

    this.#wsProvider.on('sync', (isSynced: boolean) => {
      this.#synced.set(isSynced);
    });

    // Awareness
    this.#wsProvider.awareness.setLocalStateField('user', {
      id: userId,
    });

    const awarenessHandler = () => {
      if (!this.#wsProvider) return;
      const states = new Map(this.#wsProvider.awareness.getStates());
      this.awarenessStates.set(states);
    };

    this.#wsProvider.awareness.on('change', awarenessHandler);
    this.#observers.push(() =>
      this.#wsProvider?.awareness.off('change', awarenessHandler),
    );

    // IndexedDB Persistence (Offline)
    this.#idbProvider = new IndexeddbPersistence(`tapiz-${boardId}`, this.#doc);
  }

  disconnect(): void {
    this.#observers.forEach((fn) => fn());
    this.#observers = [];
    this.#wsProvider?.disconnect();
    this.#wsProvider?.destroy();
    this.#wsProvider = null;
    this.#idbProvider?.destroy();
    this.#idbProvider = null;
    this.#doc?.destroy();
    this.#doc = null;
    this.#nodesSignal.set([]);
    this.#connected.set(false);
    this.#synced.set(false);
  }

  // --- State Operations ---

  addNode(node: TuNode): void {
    if (!this.#doc) return;
    const nodesArray = this.#doc.getArray<Y.Map<unknown>>('nodes');
    const yNode = this.#nodeToYMap(node);
    nodesArray.push([yNode]);
  }

  patchNode(id: string, partial: Record<string, unknown>): void {
    if (!this.#doc) return;
    const nodesArray = this.#doc.getArray<Y.Map<unknown>>('nodes');

    this.#doc.transact(() => {
      for (let i = 0; i < nodesArray.length; i++) {
        const yNode = nodesArray.get(i);
        if (yNode.get('id') === id) {
          const content = yNode.get('content') as Y.Map<unknown>;
          if (content) {
            for (const [key, value] of Object.entries(partial)) {
              content.set(key, value);
            }
          }
          break;
        }
      }
    });
  }

  removeNode(id: string): void {
    if (!this.#doc) return;
    const nodesArray = this.#doc.getArray<Y.Map<unknown>>('nodes');

    this.#doc.transact(() => {
      for (let i = 0; i < nodesArray.length; i++) {
        const yNode = nodesArray.get(i);
        if (yNode.get('id') === id) {
          nodesArray.delete(i, 1);
          break;
        }
      }
    });
  }

  applyActions(actions: StateActions[]): void {
    if (!this.#doc) return;

    this.#doc.transact(() => {
      for (const action of actions) {
        switch (action.op) {
          case 'add':
            this.addNode(action.data as TuNode);
            break;
          case 'patch':
            this.patchNode(
              action.data.id,
              (action.data as TuNode).content as Record<string, unknown>,
            );
            break;
          case 'remove':
            this.removeNode(action.data.id);
            break;
        }
      }
    });
  }

  getNode(id: string): TuNode | undefined {
    if (!this.#doc) return undefined;
    const nodesArray = this.#doc.getArray<Y.Map<unknown>>('nodes');

    for (let i = 0; i < nodesArray.length; i++) {
      const yNode = nodesArray.get(i);
      if (yNode.get('id') === id) {
        return this.#yMapToNode(yNode);
      }
    }
    return undefined;
  }

  /** Import existing JSON board state into a fresh Yjs document */
  importFromJson(nodes: TuNode[]): void {
    if (!this.#doc) return;
    const nodesArray = this.#doc.getArray<Y.Map<unknown>>('nodes');

    if (nodesArray.length > 0) return; // Already has data

    this.#doc.transact(() => {
      for (const node of nodes) {
        nodesArray.push([this.#nodeToYMap(node)]);
      }
    });
  }

  // --- Awareness helpers ---

  setLocalCursor(cursor: { x: number; y: number } | null): void {
    this.#wsProvider?.awareness.setLocalStateField('cursor', cursor);
  }

  setLocalViewport(position: { x: number; y: number }, zoom: number): void {
    this.#wsProvider?.awareness.setLocalStateField('viewport', {
      position,
      zoom,
    });
  }

  // --- Conversion helpers ---

  #nodeToYMap(node: TuNode): Y.Map<unknown> {
    const yNode = new Y.Map<unknown>();
    yNode.set('id', node.id);
    yNode.set('type', node.type);

    const yContent = new Y.Map<unknown>();
    if (node.content && typeof node.content === 'object') {
      for (const [key, value] of Object.entries(
        node.content as Record<string, unknown>,
      )) {
        yContent.set(key, value);
      }
    }
    yNode.set('content', yContent);

    if (node.children?.length) {
      const yChildren = new Y.Array<Y.Map<unknown>>();
      for (const child of node.children) {
        yChildren.push([this.#nodeToYMap(child)]);
      }
      yNode.set('children', yChildren);
    }

    return yNode;
  }

  #yMapToNode(yNode: Y.Map<unknown>): TuNode {
    const content: Record<string, unknown> = {};
    const yContent = yNode.get('content') as Y.Map<unknown> | undefined;
    if (yContent) {
      for (const [key, value] of yContent.entries()) {
        content[key] = value;
      }
    }

    const node: TuNode = {
      id: yNode.get('id') as string,
      type: yNode.get('type') as string,
      content,
    };

    const yChildren = yNode.get('children') as
      | Y.Array<Y.Map<unknown>>
      | undefined;
    if (yChildren?.length) {
      node.children = [];
      for (let i = 0; i < yChildren.length; i++) {
        node.children.push(this.#yMapToNode(yChildren.get(i)));
      }
    }

    return node;
  }

  #yArrayToNodes(yArray: Y.Array<Y.Map<unknown>>): TuNode[] {
    const nodes: TuNode[] = [];
    for (let i = 0; i < yArray.length; i++) {
      nodes.push(this.#yMapToNode(yArray.get(i)));
    }
    return nodes;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
