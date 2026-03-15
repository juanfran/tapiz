import * as Y from 'yjs';
import { type IncomingMessage } from 'http';
import { type WebSocket } from 'ws';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import db from './db/index.js';
import type { TuNode } from '@tapiz/board-commons';

const messageSync = 0;
const messageAwareness = 1;

interface YjsDoc {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  persistTimeout: ReturnType<typeof setTimeout> | null;
}

const docs = new Map<string, YjsDoc>();

function getYDoc(boardId: string): YjsDoc {
  const existing = docs.get(boardId);
  if (existing) return existing;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  const yjsDoc: YjsDoc = {
    doc,
    awareness,
    conns: new Map(),
    persistTimeout: null,
  };

  awareness.on(
    'update',
    (
      {
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      },
      conn: WebSocket | null,
    ) => {
      const changedClients = added.concat(updated, removed);
      if (conn) {
        const connControlledIDs = yjsDoc.conns.get(conn);
        if (connControlledIDs) {
          added.forEach((clientID) => connControlledIDs.add(clientID));
          removed.forEach((clientID) => connControlledIDs.delete(clientID));
        }
      }

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);

      yjsDoc.conns.forEach((_, c) => {
        send(yjsDoc, c, message);
      });
    },
  );

  doc.on('update', () => {
    schedulePersist(boardId, yjsDoc);

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, Y.encodeStateAsUpdate(doc));
    const message = encoding.toUint8Array(encoder);

    yjsDoc.conns.forEach((_, conn) => {
      send(yjsDoc, conn, message);
    });
  });

  docs.set(boardId, yjsDoc);
  return yjsDoc;
}

function schedulePersist(boardId: string, yjsDoc: YjsDoc): void {
  if (yjsDoc.persistTimeout) {
    clearTimeout(yjsDoc.persistTimeout);
  }

  yjsDoc.persistTimeout = setTimeout(async () => {
    const state = Y.encodeStateAsUpdate(yjsDoc.doc);
    await db.board.updateBoardYjs(boardId, Buffer.from(state));
    yjsDoc.persistTimeout = null;
  }, 3000);
}

function send(yjsDoc: YjsDoc, conn: WebSocket, message: Uint8Array): void {
  if (conn.readyState !== conn.CLOSING && conn.readyState !== conn.CLOSED) {
    try {
      conn.send(message, (err) => {
        if (err) closeConn(yjsDoc, conn);
      });
    } catch {
      closeConn(yjsDoc, conn);
    }
  }
}

function closeConn(yjsDoc: YjsDoc, conn: WebSocket): void {
  const controlledIDs = yjsDoc.conns.get(conn);
  yjsDoc.conns.delete(conn);

  if (controlledIDs) {
    awarenessProtocol.removeAwarenessStates(
      yjsDoc.awareness,
      Array.from(controlledIDs),
      null,
    );
  }

  // Cleanup if no more connections
  const boardId = [...docs.entries()].find(([, d]) => d === yjsDoc)?.[0];
  if (yjsDoc.conns.size === 0 && boardId) {
    // Final persist
    const state = Y.encodeStateAsUpdate(yjsDoc.doc);
    db.board.updateBoardYjs(boardId, Buffer.from(state)).catch(console.error);

    if (yjsDoc.persistTimeout) {
      clearTimeout(yjsDoc.persistTimeout);
    }

    yjsDoc.doc.destroy();
    docs.delete(boardId);
  }
}

function messageListener(
  conn: WebSocket,
  yjsDoc: YjsDoc,
  message: Uint8Array,
): void {
  try {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, yjsDoc.doc, null);
        if (encoding.length(encoder) > 1) {
          send(yjsDoc, conn, encoding.toUint8Array(encoder));
        }
        break;
      }
      case messageAwareness:
        awarenessProtocol.applyAwarenessUpdate(
          yjsDoc.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
    }
  } catch (err) {
    console.error('Yjs message error:', err);
  }
}

export async function setupWSConnection(
  conn: WebSocket,
  _req: IncomingMessage,
  boardId: string,
): Promise<void> {
  const yjsDoc = getYDoc(boardId);
  const controlledIds = new Set<number>();
  yjsDoc.conns.set(conn, controlledIds);

  // Load from DB if empty doc
  if (yjsDoc.doc.getArray('nodes').length === 0) {
    const board = await db.board.getBoard(boardId);
    if (board) {
      const yjsState = await db.board.getBoardYjs(boardId);
      if (yjsState) {
        Y.applyUpdate(yjsDoc.doc, new Uint8Array(yjsState));
      } else if (board.board?.length) {
        // Migration: import JSON board into Yjs
        importJsonToYjs(yjsDoc.doc, board.board);
        // Persist the imported Yjs state
        const state = Y.encodeStateAsUpdate(yjsDoc.doc);
        await db.board.updateBoardYjs(boardId, Buffer.from(state));
      }
    }
  }

  conn.binaryType = 'arraybuffer';

  conn.on('message', (message: ArrayBuffer) => {
    messageListener(conn, yjsDoc, new Uint8Array(message));
  });

  conn.on('close', () => {
    closeConn(yjsDoc, conn);
  });

  // Send initial sync step 1
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, yjsDoc.doc);
    send(yjsDoc, conn, encoding.toUint8Array(encoder));
  }

  // Send awareness states
  const awarenessStates = yjsDoc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        yjsDoc.awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    send(yjsDoc, conn, encoding.toUint8Array(encoder));
  }
}

function importJsonToYjs(doc: Y.Doc, nodes: TuNode[]): void {
  const nodesArray = doc.getArray('nodes');

  doc.transact(() => {
    for (const node of nodes) {
      if (node.type === 'user') continue; // Skip ephemeral user nodes
      nodesArray.push([nodeToYMap(node)]);
    }
  });
}

function nodeToYMap(node: TuNode): Y.Map<unknown> {
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
      yChildren.push([nodeToYMap(child)]);
    }
    yNode.set('children', yChildren);
  }

  return yNode;
}
