import { DestroyRef, Injectable, Signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Editor } from '@tiptap/core';
import { Observable, Subject, fromEvent, merge } from 'rxjs';

@Injectable()
export class ToolbarEditorService {
  #destroyRef = inject(DestroyRef);

  #editor?: Signal<Editor>;
  #events = new Subject<Editor>();

  get events$() {
    return this.#events.asObservable();
  }

  listenToEditor(editor: Signal<Editor>) {
    this.#editor = editor;

    const editorUpdate = fromEvent(this.#editor(), 'update') as Observable<{
      editor: Editor;
    }>;
    const editorSelectionUpdate = fromEvent(
      this.#editor(),
      'selectionUpdate',
    ) as Observable<{ editor: Editor }>;

    merge(editorUpdate, editorSelectionUpdate)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(({ editor }) => {
        requestAnimationFrame(() => {
          this.#events.next(editor);
        });
      });
  }
}
