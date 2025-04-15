import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { PollAnswerNode, PollBoardNode } from '@tapiz/board-commons';
import { MatIconModule } from '@angular/material/icon';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { decrypt } from '@tapiz/utils/crypto';
import { output } from '@angular/core';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-poll-options',
  imports: [
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatRadioModule,
  ],
  template: `
    @if (node().content; as nodeContent) {
      <form (ngSubmit)="submit()">
        <mat-radio-group [formControl]="optionControl">
          @for (option of nodeContent.options; track option.id) {
            <div class="option">
              <mat-radio-button
                color="primary"
                [value]="option.id"
                >{{ option.text }}</mat-radio-button
              >
            </div>
          }
        </mat-radio-group>

        <p class="total-votes">Total votes: {{ totalVotes() }}</p>

        <div class="actions">
          @if (!userVote()) {
            <button
              class="submit"
              type="submit"
              mat-raised-button
              color="primary">
              Vote
            </button>
          } @else {
            <button
              type="button"
              (click)="resetUserVote()"
              mat-stroked-button
              color="primary">
              Reset vote
            </button>
          }

          <button
            type="button"
            (click)="onEndPoll()"
            mat-stroked-button
            color="primary">
            End poll
          </button>
        </div>
      </form>
    }
  `,
  styleUrls: ['./poll-options.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollOptionsComponent {
  #store = inject(Store);
  #privateId = this.#store.selectSignal(boardPageFeature.selectPrivateId);

  node = input.required<PollBoardNode>();
  userId = input.required<string>();

  userVote = signal<PollAnswerNode | undefined>(undefined);

  totalVotes = computed(() => {
    const children = this.node().children ?? [];

    return children.length;
  });

  optionControl = new FormControl('', {
    validators: [Validators.required],
    nonNullable: true,
  });

  vote = output<string>();

  resetVote = output<string>();

  endPoll = output<void>();

  constructor() {
    effect(async () => {
      const userVote = await this.#userVote();

      this.userVote.set(userVote);

      if (userVote) {
        this.optionControl.setValue(userVote.content.optionId);
        this.optionControl.disable();
      } else {
        this.optionControl.enable();
      }
    });
  }

  submit() {
    this.vote.emit(this.optionControl.value);
  }

  resetUserVote() {
    const userVote = this.userVote();

    if (!userVote) {
      return;
    }

    this.resetVote.emit(userVote.id);
  }

  onEndPoll() {
    this.endPoll.emit();
  }

  async #userVote(): Promise<PollAnswerNode | undefined> {
    const userId = this.userId();
    const isPrivate = this.node().content.mode === 'anonymous';
    const children = (this.node().children as PollAnswerNode[]) ?? [];

    if (isPrivate) {
      const parseChildren = await Promise.all(
        children.map(async (a) => {
          const decrypted = await decrypt(
            a.content.userId,
            this.#privateId(),
            true,
          );

          return { ...a, content: { ...a.content, userId: decrypted } };
        }),
      );

      return parseChildren.find((a) => a.content.userId === userId);
    } else {
      return children.find((a) => a.content.userId === userId);
    }
  }
}
