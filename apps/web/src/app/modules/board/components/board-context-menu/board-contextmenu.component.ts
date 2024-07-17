import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { NodesStore } from '@tapiz/nodes/services/nodes.store';
import {
  ContextMenuItem,
  ContextMenuStore,
} from '@tapiz/ui/context-menu/context-menu.store';
import { combineLatest, take } from 'rxjs';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardComponent } from '../../board/board.component';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { CopyPasteService } from '../../../../services/copy-paste.service';
import { BoardFacade } from '../../../../services/board-facade.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { VotesModalComponent } from '../votes-modal/votes-modal.component';
import { Group, NodePatch, Note, TuNode } from '@tapiz/board-commons';
import { CommentsStore } from '@tapiz/nodes/comments/comments.store';
import { NodesActions } from '@tapiz/nodes/services/nodes-actions';
import Pickr from '@simonwep/pickr';
import { colorPickerConfig } from '@tapiz/ui/color-picker/color-picker.config';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'tapiz-board-context-menu',
  template: '',
  styles: `
    :host {
      display: none;
    }
  `,
  standalone: true,
  imports: [MatDialogModule],
})
export class BoardContextMenuComponent implements OnInit {
  private contextMenuStore = inject(ContextMenuStore);
  private copyPasteService = inject(CopyPasteService);
  private nodesStore = inject(NodesStore);
  private boardFacade = inject(BoardFacade);
  private store = inject(Store);
  private boardComponent = inject(BoardComponent);
  private dialog = inject(MatDialog);
  private commentsStore = inject(CommentsStore);
  private nodesActions = inject(NodesActions);
  private showUserVotes = this.store.selectSignal(pageFeature.selectVoting);
  private selectFocusNodes = toSignal(this.boardFacade.selectFocusNodes$);

  public readonly boardMode = this.store.selectSignal(
    pageFeature.selectBoardMode,
  );

  ngOnInit() {
    this.contextMenuStore.config({
      element: this.boardComponent.el.nativeElement,
      isValid: () => {
        const activeToolbarOption = this.nodesStore.activeToolbarOption();

        if (activeToolbarOption === 'emoji' || activeToolbarOption === 'vote') {
          return false;
        }

        return true;
      },
      items: () => {
        if (this.showUserVotes()) {
          return [];
        }

        const currentNodes = this.selectFocusNodes();

        if (currentNodes?.length) {
          const actions: ContextMenuItem[] = [
            {
              label: 'Copy',
              icon: 'content_copy',
              help: 'Ctrl + C',
              action: () => {
                this.nodesStore.actions.copyNodes({ nodes: currentNodes });
              },
            },
            {
              label: 'Delete',
              icon: 'delete',
              help: 'Supr',
              action: () => {
                this.nodesStore.actions.deleteNodes({
                  nodes: currentNodes.map((it) => {
                    return {
                      id: it.id,
                      type: it.type,
                    };
                  }),
                });
              },
            },
            {
              label: 'Move forward',
              icon: 'vertical_align_top',
              action: () => {
                const actions = this.nodesActions.bulkPatch(
                  currentNodes.map((it) => {
                    return {
                      node: {
                        id: it.id,
                        type: it.type,
                        content: {},
                      },
                      options: {
                        position: -1,
                      },
                    };
                  }),
                );

                this.store.dispatch(
                  BoardActions.batchNodeActions({
                    history: true,
                    actions,
                  }),
                );
              },
            },
            {
              label: 'Move backward',
              icon: 'vertical_align_bottom',
              action: () => {
                const actions = this.nodesActions
                  .bulkPatch(
                    currentNodes.map((it) => {
                      return {
                        node: {
                          id: it.id,
                          type: it.type,
                          content: {},
                        },
                        options: {
                          position: 0,
                        },
                      };
                    }),
                  )
                  .toReversed();

                this.store.dispatch(
                  BoardActions.batchNodeActions({
                    history: true,
                    actions,
                  }),
                );
              },
            },
          ];

          if (this.boardMode() === 0) {
            actions.unshift({
              label: 'Move to edit mode',
              icon: 'flip_to_back',
              action: () => {
                this.store.dispatch(
                  BoardActions.batchNodeActions({
                    history: true,
                    actions: currentNodes.map((node) => {
                      return this.nodesActions.patch({
                        type: node.type,
                        id: node.id,
                        content: {
                          layer: 1,
                        },
                      });
                    }),
                  }),
                );

                this.store.dispatch(
                  PageActions.setFocusId({
                    focusId: '',
                  }),
                );
              },
            });
          } else {
            actions.unshift({
              label: 'Move to participant mode',
              icon: 'flip_to_front',
              action: () => {
                this.store.dispatch(
                  BoardActions.batchNodeActions({
                    history: true,
                    actions: currentNodes.map((node) => {
                      return this.nodesActions.patch({
                        type: node.type,
                        id: node.id,
                        content: {
                          layer: 0,
                        },
                      });
                    }),
                  }),
                );

                this.store.dispatch(
                  PageActions.setFocusId({
                    focusId: '',
                  }),
                );
              },
            });
          }

          if (currentNodes.length === 1) {
            const isNote = currentNodes[0].type === 'note';

            if (isNote) {
              const note = currentNodes[0] as TuNode<Note>;

              actions.push(
                {
                  label: 'Comments',
                  icon: 'comments',
                  action: () => {
                    this.commentsStore.setParentNode(currentNodes[0]['id']);
                  },
                },
                {
                  label: 'Color',
                  icon: 'palette',
                  action: () => {
                    const noteEl = document.querySelector<HTMLElement>(
                      `[data-id="${note.id}"]`,
                    );

                    if (!noteEl) {
                      return;
                    }

                    const pickr = Pickr.create({
                      ...colorPickerConfig,
                      el: noteEl,
                      useAsButton: true,
                      default: note.content.color ?? '#fdab61',
                    });

                    pickr.show();

                    pickr.on('save', (color: Pickr.HSVaColor | null) => {
                      const patchNote: NodePatch<Note> = {
                        data: {
                          type: 'note',
                          id: note.id,
                          content: {
                            color: color?.toHEXA().toString() ?? null,
                          },
                        },
                        op: 'patch',
                      };

                      this.store.dispatch(
                        BoardActions.batchNodeActions({
                          history: true,
                          actions: [patchNote],
                        }),
                      );

                      pickr.hide();
                      pickr.destroy();
                    });
                  },
                },
              );
            }
          }

          const showVotesNode = currentNodes
            .filter((node) => {
              return node.type === 'note' || node.type === 'group';
            })
            .at(0) as TuNode<Group | Note> | undefined;

          if (showVotesNode && showVotesNode.content.votes.length) {
            actions.push({
              label: 'Show votes',
              icon: 'visibility',
              action: () => {
                this.dialog.open(VotesModalComponent, {
                  width: '400px',
                  data: {
                    node: showVotesNode,
                  },
                });
              },
            });
          }

          return actions;
        }

        return [
          {
            label: 'Paste',
            icon: 'content_paste',
            help: 'Ctrl + V',
            action: (event: MouseEvent) => {
              combineLatest([
                this.store.select(pageFeature.selectPosition),
                this.store.select(pageFeature.selectZoom),
              ])
                .pipe(take(1))
                .subscribe(([position, zoom]) => {
                  this.copyPasteService.pasteCurrentClipboard({
                    x: (-position.x + event.x) / zoom,
                    y: (-position.y + event.y) / zoom,
                  });
                });
            },
          },
        ];
      },
    });
  }
}
