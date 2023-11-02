import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  EstimationConfig,
  EstimationResultNode,
  EstimationStory,
  User,
} from '@team-up/board-commons';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NodesStore } from '@team-up/nodes/services/nodes.store';

@Component({
  selector: 'team-up-estimation-workspace',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="nav">
      <div
        class="move"
        *ngIf="stories().length > 1">
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
        @for (user of nodesStore.users(); track user.id) {
          @if (nodesStore.userId() !== user.id) {
            <div class="user">
              <p>
                {{ user.name }}
                @if (getUserVote(user, story.id); as userVote) {
                  @if (story.show) {
                    <span class="user-vote">{{ userVote }}</span>
                  } @else {
                    <span class="user-vote">?</span>
                  }
                } @else {
                  <span class="user-vote empty">?</span>
                }
              </p>
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
  nodesStore = inject(NodesStore);

  private scaleSetup = {
    fibonacci: ['1', '2', '3', '5', '8', '13', '21'],
    ['t-shirt']: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  };

  @Input()
  public set estimation(estimation: EstimationConfig) {
    this.stories.set(estimation.stories);
    this.step.set(estimation.step);
    this.scale.set(this.scaleSetup[estimation.scale]);
  }

  @Input()
  public set results(results: EstimationResultNode[]) {
    this.storiesResults.set(results);
  }

  public userResults = computed(() => {
    const estimationResult = this.storiesResults();

    if (!estimationResult) {
      return;
    }
    return estimationResult.find(
      (result) => result.content.userId === this.nodesStore.userId(),
    );
  });

  @Output()
  public setStep = new EventEmitter<number>();

  @Output()
  public storyVisibility = new EventEmitter<{
    storyId: string;
    visibility: boolean;
  }>();

  @Output()
  public vote = new EventEmitter<{
    storyId: string;
    vote: string;
  }>();

  public currentStory = computed(() => {
    return this.stories()[this.step()];
  });
  public stories = signal<EstimationStory[]>([]);
  public step = signal<number>(0);
  public scale = signal<string[]>(this.scaleSetup.fibonacci);
  public storiesResults = signal<EstimationResultNode[]>([]);
  public userStoriesResults = computed(() => {
    const estimationResult = this.storiesResults();

    return estimationResult.find(
      (result) => result.content.userId === this.nodesStore.userId(),
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
    const results = this.storiesResults();

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
