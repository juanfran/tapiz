import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import type {
  EstimationConfig,
  EstimationConfigNode,
  EstimationNodes,
  EstimationResultNode,
  EstimationStory,
  StateActions,
} from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { MatSelectModule } from '@angular/material/select';
import { BoardActions } from './estimation.component';
import { FormsModule } from '@angular/forms';
import { InitEstimationComponent } from './init-estimation/init-estimation.component';
import { EstimationStoriesComponent } from './estimation-stories/estimation-stories.component';
import { v4 } from 'uuid';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { EstimationWorkspaceComponent } from './estimation-workspace/estimation-workspace.component';
import { input } from '@angular/core';

export { BoardActions } from '@tapiz/board-commons/actions/board.actions';

@Component({
  selector: 'tapiz-estimation',
  standalone: true,
  imports: [
    MatSelectModule,
    FormsModule,
    InitEstimationComponent,
    EstimationStoriesComponent,
    MatIconModule,
    MatMenuModule,
    EstimationWorkspaceComponent,
  ],
  template: `
    @if (config(); as estimationConfig) {
      @if (screen() === 'main') {
        <div class="header">
          <button
            [matMenuTriggerFor]="menu"
            type="button"
            mat-fab
            class="config-stories-button">
            <mat-icon>settings</mat-icon>
          </button>
          <mat-menu #menu="matMenu">
            <button
              mat-menu-item
              (click)="screen.set('scales')">
              Estimation scale
            </button>
            <button
              mat-menu-item
              (click)="screen.set('stories')">
              Stories
            </button>
            <button
              mat-menu-item
              (click)="deleteEstimation()">
              Delete
            </button>
          </mat-menu>
        </div>
        @if (estimationConfig.content.stories.length) {
          <tapiz-estimation-workspace
            [estimation]="estimationConfig.content"
            [results]="results()"
            (setStep)="setEstimationStep($event)"
            (vote)="vote($event)"
            (storyVisibility)="
              setStoryVisibility($event)
            "></tapiz-estimation-workspace>
        }
      }
      @if (screen() === 'stories') {
        <tapiz-estimation-stories
          [estimationStories]="estimationConfig.content.stories"
          [showCancel]="!!estimationConfig.content.stories.length"
          (addStory)="onAddStory($event)"
          (closeConfig)="screen.set('main')"></tapiz-estimation-stories>
      }
      @if (screen() === 'scales') {
        <tapiz-init-estimation
          [scale]="estimationConfig.content.scale"
          (completeSetup)="editScale($event)"></tapiz-init-estimation>
      }
    }

    @if (!config()) {
      <tapiz-init-estimation
        (completeSetup)="onCompleteSetup($event)"></tapiz-init-estimation>
    }
  `,
  styleUrls: ['./estimation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationComponent {
  private store = inject(Store);
  public userResults = computed(() => {
    const results = this.results();

    return results.find((result) => result.content.userId === this.userId());
  });
  public screen = signal<'stories' | 'scales' | 'main'>('main');

  public userId = input.required<string>();

  public parentId = input<string>();

  public nodes = input<EstimationNodes[]>([]);

  config = computed(() => {
    return this.nodes().find(
      (node): node is EstimationConfigNode => node.type === 'estimation.config',
    );
  });

  public results = computed(() => {
    return this.nodes().filter(
      (node): node is EstimationResultNode => node.type === 'estimation.result',
    );
  });

  public editScale(scale: string) {
    const config = this.config();

    if (config) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              op: 'patch',
              parent: this.parentId(),
              data: {
                ...config,
                content: {
                  ...config.content,
                  scale,
                },
              },
            },
          ],
        }),
      );
    }

    this.screen.set('main');
  }

  public onCompleteSetup(scale: EstimationConfig['scale']) {
    const estimationConfig: EstimationConfigNode = {
      id: v4(),
      type: 'estimation.config',
      children: [],
      content: {
        scale: scale,
        stories: [],
        step: 0,
      },
    };

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          {
            op: 'add',
            parent: this.parentId(),
            data: estimationConfig,
          },
        ],
      }),
    );

    this.screen.set('stories');
  }

  public onAddStory(stories: EstimationStory[]) {
    const config = this.config();

    if (config) {
      let step = config.content.step;

      if (stories.length - 1 < config.content.step) {
        step = stories.length - 1;

        if (step < 0) {
          step = 0;
        }
      }

      const actions: StateActions[] = [
        {
          op: 'patch',
          parent: this.parentId(),
          data: {
            ...config,
            content: {
              ...config.content,
              step,
              stories,
            },
          },
        },
      ];

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions,
        }),
      );
    }

    this.screen.set('main');
  }

  public setStoryVisibility({
    storyId,
    visibility,
  }: {
    storyId: string;
    visibility: boolean;
  }) {
    const config = this.config();

    if (config) {
      const stories = config.content.stories.map((story) => {
        if (story.id === storyId) {
          return {
            ...story,
            show: visibility,
          };
        }

        return story;
      });

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              op: 'patch',
              parent: this.parentId(),
              data: {
                ...config,
                content: {
                  ...config.content,
                  stories,
                },
              },
            },
          ],
        }),
      );
    }
  }

  public deleteEstimation() {
    const config = this.config();
    const id = this.parentId();

    if (config && id) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              op: 'remove',
              data: {
                type: 'estimation',
                id,
              },
            },
          ],
        }),
      );
    }
  }

  public setEstimationStep(step: number) {
    const config = this.config();

    if (config) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              op: 'patch',
              parent: this.parentId(),
              data: {
                ...config,
                content: {
                  ...config.content,
                  step,
                },
              },
            },
          ],
        }),
      );
    }
  }

  public vote({ storyId, vote }: { storyId: string; vote: string }) {
    const config = this.config();
    let resultsNode = this.userResults();
    const op = resultsNode ? 'patch' : 'add';

    if (!resultsNode) {
      resultsNode = {
        id: v4(),
        type: 'estimation.result',
        content: {
          userId: this.userId(),
          results: [],
        },
      };
    }

    resultsNode = {
      ...resultsNode,
      content: {
        ...resultsNode.content,
        results: resultsNode.content.results.filter((result) => {
          return result.storyId !== storyId;
        }),
      },
    };

    resultsNode.content.results.push({
      storyId,
      selection: vote,
    });

    if (config) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              op,
              parent: this.parentId(),
              data: resultsNode,
            },
          ],
        }),
      );
    }
  }
}
