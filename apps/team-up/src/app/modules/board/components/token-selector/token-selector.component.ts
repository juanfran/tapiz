import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Output,
  EventEmitter,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { selectUsers } from '../../selectors/board.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  BoardColors,
  BoardIdToColorDirective,
} from '@/app/shared/board-id-to-color.directive';
import { RxFor } from '@rx-angular/template/for';

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
  imports: [CommonModule, BoardIdToColorDirective, RxFor],
})
export class TokenSelectorComponent {
  @Output()
  public selectToken = new EventEmitter<{
    text: string;
    color: string;
    backgroundColor: string;
  }>();

  private store = inject(Store);

  public users = toSignal(
    this.store.select(selectUsers).pipe(
      map((users) => {
        return users.map((user) => ({
          id: user.id,
          name: user.name
            .split(' ')
            .slice(0, 2)
            .map((it) => it[0])
            .join('')
            .toUpperCase(),
        }));
      })
    )
  );

  public colors = BoardColors;

  public selectUserToken(text: string, color: string, backgroundColor: string) {
    this.selectToken.emit({ text, color, backgroundColor });
  }
}
