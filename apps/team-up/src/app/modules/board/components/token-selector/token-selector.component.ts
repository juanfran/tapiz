import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  BoardColors,
  BoardIdToColorDirective,
} from '../../../../shared/board-id-to-color.directive';
import { RxFor } from '@rx-angular/template/for';
import { BoardFacade } from '../../../../services/board-facade.service';
import { output } from '@angular/core';

@Component({
  selector: 'team-up-token-selector',
  styleUrls: ['./token-selector.component.scss'],
  template: `
    <div class="tokens">
      <h3 class="title">Team</h3>
      <div class="token-list">
        <button
          type="button"
          *rxFor="let user of users(); trackBy: 'id'"
          [teamUpBoardIdToColor]="user.id"
          #teamUpBoardIdToColor="teamUpBoardIdToColor"
          class="token"
          (click)="
            selectUserToken(
              user.name,
              teamUpBoardIdToColor.color,
              teamUpBoardIdToColor.backgroundColor
            )
          ">
          {{ user.name }}
        </button>
      </div>
    </div>
    <div class="tokens">
      <h3 class="title">Tokens</h3>
      <div class="token-list">
        <button
          *rxFor="let bColor of colors"
          type="button"
          class="token"
          [style.background-color]="bColor.backgroundColor"
          [style.color]="bColor.color"
          (click)="
            selectUserToken('', bColor.color, bColor.backgroundColor)
          "></button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [BoardIdToColorDirective, RxFor],
})
export class TokenSelectorComponent {
  public selectToken = output<{
    text: string;
    color: string;
    backgroundColor: string;
  }>();

  private boardFacade = inject(BoardFacade);

  public users = toSignal(
    this.boardFacade.getUsers().pipe(
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

  public colors = BoardColors;

  public selectUserToken(text: string, color: string, backgroundColor: string) {
    this.selectToken.emit({ text, color, backgroundColor });
  }
}
