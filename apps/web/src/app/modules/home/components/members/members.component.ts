import { ModalHeaderComponent } from '../../../../shared/modal-header/modal-header.component';
import { trackByProp } from '../../../../shared/track-by-prop';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Invitation, Member } from '@tapiz/board-commons';
import { output } from '@angular/core';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-members',

  template: `
    <tapiz-modal-header [title]="title()"></tapiz-modal-header>
    @if (editable()) {
      <form
        class="invite-by-email"
        [formGroup]="form"
        (submit)="submit()">
        <h2 class="invite-title">Invite by email</h2>
        <div class="row-emails">
          <mat-form-field class="emails">
            <input
              formControlName="emails"
              placeholder="Emails, separated by commas"
              matInput
              type="text" />
          </mat-form-field>

          <mat-form-field [hideRequiredMarker]="true">
            <mat-label>Role</mat-label>
            <mat-select formControlName="role">
              <mat-option value="member">Member</mat-option>
              <mat-option value="admin">Admin</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="actions">
          <button
            [disabled]="!form.valid"
            class="submit"
            type="submit"
            mat-raised-button
            color="primary">
            Send invites
          </button>
        </div>
      </form>
    }
    @if (invitations().length || members().length) {
      <mat-dialog-content class="members()">
        @if (invitations().length) {
          <div class="members-list invitations()">
            @for (
              invitation of invitations();
              track trackByInvitationId($index, invitation)
            ) {
              <div class="member">
                <ng-container
                  *ngTemplateOutlet="
                    memberTpl;
                    context: {
                      member: {
                        id: invitation.id,
                        name: invitation.email,
                        role: invitation.role,
                      },
                    }
                  ">
                </ng-container>
              </div>
            }
          </div>
        }
        <div class="members-list">
          @for (member of members(); track trackByMemberId($index, member)) {
            <div class="member">
              <ng-container
                *ngTemplateOutlet="
                  memberTpl;
                  context: {
                    member: {
                      id: member.id,
                      name: member.name,
                      email: member.email,
                      role: member.role,
                    },
                  }
                ">
              </ng-container>
            </div>
          }
        </div>
        <ng-template
          #memberTpl
          let-member="member">
          <div class="user-info">
            <div class="name">
              {{ member.name }}
              @if (!member.email) {
                <span class="pending"> (Pending) </span>
              }
            </div>
            @if (member.email) {
              <div class="email">
                {{ member.email }}
              </div>
            }
          </div>
          @if (!(member.role === 'admin' && lastAdmin) || !member.email) {
            <mat-form-field
              class="role-select"
              placeholder="role">
              <mat-label>Role</mat-label>
              <mat-select
                [disabled]="!editable()"
                [value]="member.role"
                (valueChange)="onRoleChange($event, member.id, !member.email)">
                <mat-option value="member">Member</mat-option>
                <mat-option value="admin">Admin</mat-option>
              </mat-select>
            </mat-form-field>
            @if (editable()) {
              <button
                title="Delete member"
                tuIconButton
                (click)="onDeleteMember(member.id, !member.email)">
                <mat-icon>close</mat-icon>
              </button>
            }
          }
        </ng-template>
      </mat-dialog-content>
    }
  `,
  styleUrls: ['./members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDialogModule,
    ModalHeaderComponent,
  ],
})
export class MembersComponent implements OnChanges {
  @ViewChild(FormGroupDirective)
  formDirective!: FormGroupDirective;

  trackByMemberId = trackByProp<Member>('id');
  trackByInvitationId = trackByProp<Invitation>('id');

  form = new FormGroup({
    emails: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    role: new FormControl<Invitation['role']>('member', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  title = input.required<string>();

  members = input<Member[]>([]);

  invitations = input<Invitation[]>([]);

  editable = input<boolean>(true);

  closeDialog = output<void>();

  invited = output<Required<Pick<Invitation, 'email' | 'role'>>[]>();

  deletedInvitation = output<string>();

  deletedMember = output<string>();

  roleInvitationChanged = output<{
    id: string;
    role: Invitation['role'];
  }>();

  roleMemberChanged = output<{
    id: string;
    role: Member['role'];
  }>();

  lastAdmin = false;

  submit() {
    const emails = (this.form.value.emails ?? '')
      .split(',')
      .map((email: string) => email.trim())
      .filter((email) =>
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email),
      );

    if (emails.length) {
      const role = this.form.value.role;

      if (!role) {
        return;
      }

      this.invited.emit(
        emails.map((email) => {
          return {
            email,
            role,
          };
        }),
      );
    }

    this.form.reset();
    this.formDirective.resetForm();
  }

  onRoleChange(role: Invitation['role'], id: string, isInvitation: boolean) {
    if (isInvitation) {
      this.roleInvitationChanged.emit({ id, role });
    } else {
      this.roleMemberChanged.emit({ id, role: role });
    }
  }

  onDeleteMember(id: string, isInvitation: boolean) {
    if (isInvitation) {
      this.deletedInvitation.emit(id);
    } else {
      this.deletedMember.emit(id);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // check if there is only one admin
    if (changes['members']) {
      const admins = this.members().filter((member) => member.role === 'admin');

      this.lastAdmin = admins.length === 1;
    }
  }
}
