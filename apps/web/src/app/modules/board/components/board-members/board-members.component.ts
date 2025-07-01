import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Member } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { MembersComponent } from '../../../home/components/members/members.component';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-board-members',
  template: `
    <tapiz-members
      title="Board members"
      [canInvite]="false"
      [invitations]="[]"
      [members]="members()"
      [editable]="isAdmin()"
      (roleMemberChanged)="onRoleMemberChanged($event)"
      (closeDialog)="onCloseDialog()"></tapiz-members>
  `,
  styleUrls: ['./board-members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MembersComponent],
})
export class BoardMembersComponent {
  dialogRef = inject(MatDialogRef);
  store = inject(Store);

  isAdmin = this.store.selectSignal(boardPageFeature.selectIsAdmin);
  #boardFacade = inject(BoardFacade);
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
  // members = computed(() => {
  //   return this.#members.filter(
  //     (member) => member.id !== this.#boardFacade.userId(),
  //   );
  // });

  onCloseDialog() {
    this.dialogRef.close();
  }

  onRoleMemberChanged(member: { id: string; role: Member['role'] }) {
    const role = member.role;
    console.log('onRoleMemberChanged', member);

    // if (role !== 'guest') {
    //   this.store.dispatch(
    //     HomeActions.changeRole({
    //       teamId: this.data.teamId,
    //       memberId: member.id,
    //       role,
    //     }),
    //   );

    //   if (this.currentUserId() === member.id) {
    //     this.onCloseDialog();
    //   }
    // }
  }
}
