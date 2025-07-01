import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Member } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { MembersComponent } from '../../../home/components/members/members.component';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardApiService } from '../../../../services/board-api.service';
import { MatIconModule } from '@angular/material/icon';
import { BoardPageActions } from '../../actions/board-page.actions';

@Component({
  selector: 'tapiz-board-members',
  template: `
    <div>
      <h1 class="title">
        Board members

        <button
          type="button"
          [mat-dialog-close]="true">
          <mat-icon>close</mat-icon>
        </button>
      </h1>
      <tapiz-members
        [canInvite]="false"
        [invitations]="[]"
        [members]="members()"
        [editable]="isAdmin()"
        [canDelete]="false"
        [currentUserId]="currentUserId()"
        (roleMemberChanged)="onRoleMemberChanged($event)"
        (deletedMember)="onDeleteMember($event)"
        (closeDialog)="onCloseDialog()"></tapiz-members>
    </div>
  `,
  styleUrls: ['./board-members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MembersComponent, MatDialogModule, MatIconModule],
})
export class BoardMembersComponent {
  dialogRef = inject(MatDialogRef);
  store = inject(Store);
  boardApiService = inject(BoardApiService);

  isAdmin = this.store.selectSignal(boardPageFeature.selectIsAdmin);
  #boardUsers = this.store.selectSignal(boardPageFeature.selectBoardUsers);
  members = computed(() => {
    return this.#boardUsers().map(
      (user) =>
        ({
          id: user.id,
          name: user.name,
          role: user.role,
        }) satisfies Member,
    );
  });
  currentUserId = this.store.selectSignal(boardPageFeature.selectUserId);

  onCloseDialog() {
    this.dialogRef.close();
  }

  onRoleMemberChanged(member: { id: string; role: Member['role'] }) {
    const role = member.role;

    this.store.dispatch(
      BoardPageActions.changeRole({
        userId: member.id,
        role,
      }),
    );
  }

  onDeleteMember(memberId: string) {
    this.store.dispatch(
      BoardPageActions.deleteMember({
        userId: memberId,
      }),
    );
  }
}
