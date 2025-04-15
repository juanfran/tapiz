import { Editor, isTextSelection } from '@tiptap/core';
import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { computePosition, arrow } from '@floating-ui/dom';

export interface BubbleMenuPluginProps {
  pluginKey: PluginKey | string;
  editor: Editor;
  element: HTMLElement;
  updateDelay?: number;
  shouldShow?:
    | ((props: {
        editor: Editor;
        view: EditorView;
        state: EditorState;
        oldState?: EditorState;
        from: number;
        to: number;
        nodeDom: HTMLElement | null;
      }) => boolean)
    | null;
}

export type BubbleMenuViewProps = BubbleMenuPluginProps & {
  view: EditorView;
};

export class BubbleMenuView {
  public editor: Editor;

  public element: HTMLElement;

  public view: EditorView;

  public preventHide = false;

  public updateDelay: number;

  private updateDebounceTimer: number | undefined;

  private nodeDom: HTMLElement | null = null;

  public shouldShow: Exclude<BubbleMenuPluginProps['shouldShow'], null> = ({
    view,
    state,
    from,
    to,
  }) => {
    const { doc, selection } = state;
    const { empty } = selection;

    const isEmptyTextBlock =
      !doc.textBetween(from, to).length && isTextSelection(state.selection);

    const isChildOfMenu = this.element.contains(document.activeElement);

    const hasEditorFocus = view.hasFocus() || isChildOfMenu;

    if (
      !hasEditorFocus ||
      empty ||
      isEmptyTextBlock ||
      !this.editor.isEditable
    ) {
      return false;
    }

    return true;
  };

  constructor({
    editor,
    element,
    view,
    updateDelay = 250,
    shouldShow,
  }: BubbleMenuViewProps) {
    this.editor = editor;
    this.element = element;
    this.view = view;
    this.updateDelay = updateDelay;

    if (shouldShow) {
      this.shouldShow = shouldShow;
    }

    this.element.addEventListener('mousedown', this.mousedownHandler, {
      capture: true,
    });
    this.view.dom.addEventListener('dragstart', this.dragstartHandler);
    this.editor.on('focus', this.focusHandler);
    this.editor.on('blur', this.blurHandler);
  }

  mousedownHandler = () => {
    this.preventHide = true;
  };

  dragstartHandler = () => {
    this.hide();
  };

  focusHandler = () => {
    setTimeout(() => this.update(this.editor.view));
  };

  blurHandler = ({ event }: { event: FocusEvent }) => {
    if (this.preventHide) {
      this.preventHide = false;

      return;
    }

    if (this.element.parentNode?.contains(event.relatedTarget as Node)) {
      return;
    }

    this.hide();
  };

  tippyBlurHandler = (event: FocusEvent) => {
    this.blurHandler({ event });
  };

  update(view: EditorView, oldState?: EditorState) {
    const { state } = view;
    const hasValidSelection =
      state.selection.$from.pos !== state.selection.$to.pos;

    if (this.updateDelay > 0 && hasValidSelection) {
      this.handleDebouncedUpdate(view, oldState);
      return;
    }

    const selectionChanged = !oldState?.selection.eq(view.state.selection);
    const docChanged = !oldState?.doc.eq(view.state.doc);

    this.updateHandler(view, selectionChanged, docChanged, oldState);
  }

  handleDebouncedUpdate = (view: EditorView, oldState?: EditorState) => {
    const selectionChanged = !oldState?.selection.eq(view.state.selection);
    const docChanged = !oldState?.doc.eq(view.state.doc);

    if (!selectionChanged && !docChanged) {
      return;
    }

    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
    }

    this.updateDebounceTimer = window.setTimeout(() => {
      this.updateHandler(view, selectionChanged, docChanged, oldState);
    }, this.updateDelay);
  };

  updateHandler = (
    view: EditorView,
    selectionChanged: boolean,
    docChanged: boolean,
    oldState?: EditorState,
  ) => {
    const { state, composing } = view;
    const { selection } = state;

    const isSame = !selectionChanged && !docChanged;

    if (composing || isSame) {
      return;
    }

    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));
    const nodes: {
      nodeDom: HTMLElement;
      pos: number;
    }[] = [];

    state.doc.nodesBetween(from, to, (_, pos) => {
      const nodeDom = view.nodeDOM(pos)?.parentElement ?? null;

      if (nodeDom) {
        nodes.push({
          nodeDom,
          pos,
        });
      }
    });

    if (!nodes.length) {
      this.hide();

      return;
    }

    const { nodeDom, pos } = nodes[nodes.length - 1];

    if (this.nodeDom === nodeDom) {
      return;
    }

    this.nodeDom = nodeDom;

    const shouldShow = this.shouldShow?.({
      editor: this.editor,
      view,
      state,
      oldState,
      from,
      to,
      nodeDom,
    });

    if (!shouldShow) {
      this.hide();

      return;
    }

    this.hidden();

    setTimeout(() => {
      const nodeDom = view.nodeDOM(pos)?.parentElement;

      if (nodeDom) {
        const arrowElement = this.element.querySelector<HTMLElement>('.arrow');

        if (!arrowElement) {
          return;
        }

        computePosition(nodeDom, this.element, {
          placement: 'bottom',
          middleware: [
            arrow({
              element: arrowElement,
            }),
          ],
        }).then(({ x, y, placement, middlewareData }) => {
          Object.assign(this.element.style, {
            left: `${x}px`,
            top: `${y + 4}px`,
          });

          const arrowX = middlewareData.arrow?.x;
          const arrowY = middlewareData.arrow?.y;

          const staticSide = {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right',
          }[placement.split('-')[0]];

          Object.assign(arrowElement.style, {
            left: arrowX != null ? `${arrowX}px` : '',
            top: arrowY != null ? `${arrowY}px` : '',
            right: '',
            bottom: '',
            [staticSide ?? 'bottom']: '-4px',
          });

          this.show();
        });
      }
    }, 50);
  };

  hidden() {
    this.element.style.display = 'block';
    this.element.style.opacity = '0';
  }

  show() {
    this.element.style.display = 'block';
    this.element.style.opacity = '1';
  }

  hide() {
    this.element.style.display = '';
    this.nodeDom = null;
  }

  destroy() {
    this.view.dom.removeEventListener('dragstart', this.dragstartHandler);
    this.editor.off('focus', this.focusHandler);
    this.editor.off('blur', this.blurHandler);
  }
}

export const BubbleMenuPlugin = (options: BubbleMenuPluginProps) => {
  return new Plugin({
    key:
      typeof options.pluginKey === 'string'
        ? new PluginKey(options.pluginKey)
        : options.pluginKey,
    view: (view) => new BubbleMenuView({ view, ...options }),
  });
};
