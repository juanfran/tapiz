import { Component, inject, signal } from '@angular/core';
import { ModalHeaderComponent } from '../../../../shared/modal-header/modal-header.component';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Group, Note, TNode } from '@tapiz/board-commons';
import { BoardFacade } from '../../../../services/board-facade.service';

@Component({
  selector: 'tapiz-votes-modal',
  template: `
    <tapiz-modal-header title="Votes"></tapiz-modal-header>

    <div class="user-votes">
      @for (user of usersVotes(); track user.id) {
        <div class="user-vote">
          <div class="name">
            {{ user.name }}
          </div>

          <div class="votes">
            {{ user.votes }}
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './votes-modal.component.scss',
  imports: [ModalHeaderComponent],
})
export class VotesModalComponent {
  #boardFacade = inject(BoardFacade);
  #data = inject<{
    node: TNode<Group | Note>;
  }>(MAT_DIALOG_DATA);

  usersVotes = signal<{ id: string; name: string; votes: number }[]>([]);

  constructor() {
    const users = this.#boardFacade.usersNodes();

    const usersVotes = users
      .map((user) => {
        const userVote = this.#data.node.content.votes.find((it) => {
          return it.userId === user.id;
        });

        return {
          id: user.id,
          name: user.content.name,
          votes: userVote?.vote ?? 0,
        };
      })
      .filter((it) => it.votes > 0);

    this.usersVotes.set(usersVotes);
  }
}
