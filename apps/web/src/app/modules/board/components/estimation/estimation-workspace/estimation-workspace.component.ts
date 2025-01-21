import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import {
  EstimationConfig,
  EstimationResultNode,
  EstimationStory,
  User,
} from '@tapiz/board-commons';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { output } from '@angular/core';
import { input } from '@angular/core';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../../reducers/boardPage.reducer';
import { BoardFacade } from '../../../../../services/board-facade.service';

@Component({
  selector: 'tapiz-estimation-workspace',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="nav">
      @if (stories().length > 1) {
        <div class="move">
          <button
            mat-icon-button
            [disabled]="step() === 0"
            (click)="setStep.emit(step() - 1)"
            color="primary">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button
            mat-icon-button
            [disabled]="step() === stories().length - 1"
            (click)="setStep.emit(step() + 1)"
            color="primary">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      }
      <div class="steps">{{ step() + 1 }} / {{ stories().length }}</div>
    </div>

    @if (currentStory(); as story) {
      <div class="current-story">
        <h2>{{ story.title }}</h2>
        @if (story.description) {
          <p>{{ story.description }}</p>
        }
      </div>
      <div class="users">
        <button
          (click)="toggleStoryVisibility(story)"
          mat-stroked-button
          color="primary">
          @if (story.show) {
            Hide votes
          } @else {
            Show votes
          }
        </button>
        @for (user of users(); track user.id) {
          @if (userId() !== user.id) {
            <div class="user">
              <p
                class="user-name"
                [title]="user.name">
                {{ user.name }}
              </p>
              @if (getUserVote(user, story.id); as userVote) {
                @if (story.show) {
                  <p class="user-vote">{{ userVote }}</p>
                } @else {
                  <p class="user-vote">?</p>
                }
              } @else {
                <p class="user-vote empty">?</p>
              }
            </div>
          }
        }
      </div>
      <div class="scale-vote">
        @for (scaleItem of scale(); track $index) {
          <button
            [class.active]="currentUserStoryResult() === scaleItem"
            (click)="vote.emit({ storyId: currentStory().id, vote: scaleItem })"
            mat-stroked-button
            color="primary">
            {{ scaleItem }}
          </button>
        }
      </div>
    }
  `,
  styleUrls: ['./estimation-workspace.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationWorkspaceComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);

  private scaleSetup = {
    fibonacci: ['1', '2', '3', '5', '8', '13', '21'],
    ['t-shirt']: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  };

  estimation = input.required<EstimationConfig>();

  stories = computed(() => {
    return this.estimation().stories;
  });

  step = computed(() => {
    return this.estimation().step;
  });

  scale = computed(() => {
    return (
      this.scaleSetup[this.estimation().scale] ?? this.scaleSetup.fibonacci
    );
  });

  results = input.required<EstimationResultNode[]>();
  userId = this.#store.selectSignal(boardPageFeature.selectUserId);
  users = this.#boardFacade.users;

  public userResults = computed(() => {
    const estimationResult = this.results();

    if (!estimationResult) {
      return;
    }
    return estimationResult.find(
      (result) => result.content.userId === this.userId(),
    );
  });

  public setStep = output<number>();

  public storyVisibility = output<{
    storyId: string;
    visibility: boolean;
  }>();

  public vote = output<{
    storyId: string;
    vote: string;
  }>();

  public currentStory = computed(() => {
    return this.stories()[this.step()];
  });

  public userStoriesResults = computed(() => {
    const estimationResult = this.results();

    return estimationResult.find(
      (result) => result.content.userId === this.userId(),
    );
  });

  public currentUserStoryResult = computed(() => {
    const userResult = this.userStoriesResults();

    if (userResult) {
      return userResult.content.results.find(
        (result) => result.storyId === this.currentStory().id,
      )?.selection;
    }

    return null;
  });

  public getUserVote(user: User, storyId: string) {
    const results = this.results();

    const usersResults = results?.find((result) => {
      if (result.content.userId === user.id) {
        return result;
      }

      return null;
    });

    const selection = usersResults?.content.results.find((result) => {
      return result.storyId === storyId;
    })?.selection;

    if (selection) {
      if (this.scale().includes(selection)) {
        return selection;
      }

      return;
    }

    return;
  }

  public toggleStoryVisibility(story: EstimationStory) {
    this.storyVisibility.emit({
      storyId: story.id,
      visibility: !story.show,
    });
  }
}
