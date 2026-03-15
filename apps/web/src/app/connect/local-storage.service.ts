import { Injectable } from '@angular/core';

/**
 * Local KV storage with OPFS primary, IndexedDB fallback.
 * Feature-detected at construction time based on browser capabilities.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  readonly #useOpfs: boolean;
  #opfsRoot: FileSystemDirectoryHandle | null = null;
  #idb: IDBDatabase | null = null;

  constructor() {
    this.#useOpfs =
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      'getDirectory' in (navigator.storage ?? {});
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.#useOpfs) return this.#opfsGet<T>(key);
    return this.#idbGet<T>(key);
  }

  async put<T>(key: string, value: T): Promise<void> {
    if (this.#useOpfs) return this.#opfsPut(key, value);
    return this.#idbPut(key, value);
  }

  async delete(key: string): Promise<void> {
    if (this.#useOpfs) return this.#opfsDelete(key);
    return this.#idbDelete(key);
  }

  // --- OPFS ---

  async #getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
    if (!this.#opfsRoot) {
      this.#opfsRoot = await navigator.storage.getDirectory();
    }
    return this.#opfsRoot;
  }

  #sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_\-:.]/g, '_');
  }

  async #opfsGet<T>(key: string): Promise<T | null> {
    try {
      const root = await this.#getOpfsRoot();
      const handle = await root.getFileHandle(this.#sanitizeKey(key));
      const file = await handle.getFile();
      return JSON.parse(await file.text()) as T;
    } catch {
      return null;
    }
  }

  async #opfsPut<T>(key: string, value: T): Promise<void> {
    const root = await this.#getOpfsRoot();
    const handle = await root.getFileHandle(this.#sanitizeKey(key), { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(value));
    await writable.close();
  }

  async #opfsDelete(key: string): Promise<void> {
    try {
      const root = await this.#getOpfsRoot();
      await root.removeEntry(this.#sanitizeKey(key));
    } catch {
      // ignore
    }
  }

  // --- IndexedDB ---

  async #getIdb(): Promise<IDBDatabase> {
    if (this.#idb) return this.#idb;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('tapiz-cache', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        this.#idb = req.result;
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async #idbGet<T>(key: string): Promise<T | null> {
    const db = await this.#getIdb();
    return new Promise((resolve) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  }

  async #idbPut<T>(key: string, value: T): Promise<void> {
    const db = await this.#getIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async #idbDelete(key: string): Promise<void> {
    const db = await this.#getIdb();
    return new Promise((resolve) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}
