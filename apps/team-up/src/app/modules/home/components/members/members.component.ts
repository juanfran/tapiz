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
import { Invitation, Member } from '@team-up/board-commons';
import { output } from '@angular/core';
import { input } from '@angular/core';

@Component({
  selector: 'team-up-members',

  template: `
    <team-up-modal-header [title]="title()"></team-up-modal-header>
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
    @if (invitations().length || members().length) {
      <mat-dialog-content class="members()">
        <h2>Members</h2>
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
                        role: invitation.role
                      }
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
                      role: member.role
                    }
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
                [value]="member.role"
                (valueChange)="onRoleChange($event, member.id, !member.email)">
                <mat-option value="member">Member</mat-option>
                <mat-option value="admin">Admin</mat-option>
              </mat-select>
            </mat-form-field>
            <button
              title()="Delete member"
              tuIconButton
              (click)="onDeleteMember(member.id, !member.email)">
              <mat-icon>close</mat-icon>
            </button>
          }
        </ng-template>
      </mat-dialog-content>
    }
  `,
  styleUrls: ['./members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
  standalone: true,
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
  public formDirective!: FormGroupDirective;

  public trackByMemberId = trackByProp<Member>('id');
  public trackByInvitationId = trackByProp<Invitation>('id');

  public form = new FormGroup({
    emails: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    role: new FormControl('member', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  public title = input.required<string>();

  public members = input<Member[]>([]);

  public invitations = input<Invitation[]>([]);

  public closeDialog = output<void>();

  public invited = output<Required<Pick<Invitation, 'email' | 'role'>>[]>();

  public deletedInvitation = output<string>();

  public deletedMember = output<string>();

  public roleInvitationChanged = output<{
    id: string;
    role: Invitation['role'];
  }>();

  public roleMemberChanged = output<{
    id: string;
    role: Member['role'];
  }>();

  public lastAdmin = false;

  public submit() {
    const emails = (this.form.value.emails ?? '')
      .split(',')
      .map((email: string) => email.trim())
      .filter((email) =>
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email),
      );

    if (emails.length) {
      this.invited.emit(
        emails.map((email) => {
          return {
            email,
            role: this.form.value.role as Invitation['role'],
          };
        }),
      );
    }

    this.form.reset();
    this.formDirective.resetForm();
  }

  public onRoleChange(role: string, id: string, isInvitation: boolean) {
    if (isInvitation) {
      this.roleInvitationChanged.emit({ id, role: role as Invitation['role'] });
    } else {
      this.roleMemberChanged.emit({ id, role: role as Member['role'] });
    }
  }

  public onDeleteMember(id: string, isInvitation: boolean) {
    if (isInvitation) {
      this.deletedInvitation.emit(id);
    } else {
      this.deletedMember.emit(id);
    }
  }

  public ngOnChanges(changes: SimpleChanges) {
    // check if there is only one admin
    if (changes['members']) {
      const admins = this.members().filter((member) => member.role === 'admin');

      this.lastAdmin = admins.length === 1;
    }
  }
}
