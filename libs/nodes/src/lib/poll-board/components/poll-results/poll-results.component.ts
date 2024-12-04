import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { PollAnswerNode, PollBoardNode, User } from '@tapiz/board-commons';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface PollResult {
  text: string;
  totalVotes: number;
  usernames: string;
  percentage: number;
}

@Component({
  selector: 'tapiz-poll-results',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (node().content; as nodeContent) {
      <div class="results">
        @for (result of results(); track $index) {
          <div class="result">
            <div class="option">
              <span class="option-text">{{ result.text }}</span>
              <span class="votes">{{ result.totalVotes }} votes</span>
            </div>
            <div
              class="percentage"
              [style.width.%]="result.percentage"></div>
            @if (nodeContent.mode !== 'anonymous') {
              <div class="users">{{ result.usernames }}</div>
            }
          </div>
        }
      </div>

      <p>Total votes {{ totalVotes() }}</p>
    }
  `,
  styleUrls: ['./poll-results.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollResultsComponent {
  node = input.required<PollBoardNode>();
  users = input.required<User[]>();

  totalVotes = computed(() => {
    const children = this.node().children ?? [];

    return children.length;
  });

  results = computed(() => {
    const node = this.node();

    const children = (node.children ?? []) as PollAnswerNode[];

    return node.content.options
      .map((option) => {
        const totalVotes = children.filter(
          (child) => child.content.optionId === option.id,
        ).length;

        if (!option) {
          return;
        }

        const usersAnswer = children.filter(
          (child) => child.content.optionId === option.id,
        );

        const usernames = usersAnswer
          .map((answer) => {
            const user = this.users().find(
              (u) => u.id === answer.content.userId,
            );
            return user?.name;
          })
          .filter((result): result is string => !!result);

        const pollResult: PollResult = {
          usernames: usernames.join(', '),
          text: option.text,
          totalVotes,
          percentage: (totalVotes / children.length) * 100,
        };

        return pollResult;
      })
      .filter((result): result is PollResult => !!result)
      .toSorted((a, b) => b.totalVotes - a.totalVotes);
  });
}
