import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  BoardColors,
  BoardIdToColorDirective,
} from '../../../../shared/board-id-to-color.directive';
import { BoardFacade } from '../../../../services/board-facade.service';
import { output } from '@angular/core';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'tapiz-token-selector',
  styleUrls: ['./token-selector.component.scss'],
  template: `
    @if (!isDemo) {
      <div class="tokens">
        <h3 class="title">Team</h3>
        <div class="token-list">
          @for (user of users(); track user.id) {
            <button
              type="button"
              [tapizBoardIdToColor]="user.id"
              #tapizBoardIdToColor="tapizBoardIdToColor"
              class="token"
              (click)="
                selectUserToken(
                  user.name,
                  tapizBoardIdToColor.color(),
                  tapizBoardIdToColor.backgroundColor()
                )
              ">
              {{ user.name }}
            </button>
          }
        </div>
      </div>
    }
    <div class="tokens">
      <h3 class="title">Tokens</h3>
      <div class="token-list">
        @for (bColor of colors; track bColor.color) {
          <button
            type="button"
            class="token"
            [style.background-color]="bColor.backgroundColor"
            [style.color]="bColor.color"
            (click)="
              selectUserToken('', bColor.color, bColor.backgroundColor)
            "></button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [BoardIdToColorDirective],
})
export class TokenSelectorComponent {
  selectToken = output<{
    text: string;
    color: string;
    backgroundColor: string;
  }>();

  #boardFacade = inject(BoardFacade);
  #configService = inject(ConfigService);

  users = toSignal(
    this.#boardFacade.getUsers().pipe(
      map((users) => {
        return users
          .map((user) => {
            return user.content;
          })
          .map((user) => ({
            id: user.id,
            name: user.name
              .split(' ')
              .slice(0, 2)
              .map((it) => it[0])
              .join('')
              .toUpperCase(),
          }));
      }),
    ),
  );

  colors = BoardColors;

  get isDemo() {
    return !!this.#configService.config.DEMO;
  }

  selectUserToken(text: string, color: string, backgroundColor: string) {
    this.selectToken.emit({ text, color, backgroundColor });
  }
}
