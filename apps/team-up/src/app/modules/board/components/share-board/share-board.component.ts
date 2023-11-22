import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Store } from '@ngrx/store';
import {
  selectIsAdmin,
  selectPosition,
  selectZoom,
} from '../../selectors/page.selectors';
import { PageActions } from '../../actions/page.actions';
import { pageFeature } from '../../reducers/page.reducer';

@Component({
  selector: 'team-up-share-board',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ClipboardModule,
    MatButtonToggleModule,
    MatCheckboxModule,
  ],
  template: `
    <h1 class="title">
      Share board
      <button
        type="button"
        [mat-dialog-close]="true">
        <mat-icon>close</mat-icon>
      </button>
    </h1>
    <div class="copy-url">
      <mat-form-field>
        <mat-label>Url</mat-label>
        <input
          [readonly]="true"
          [ngModel]="url"
          matInput
          type="text" />
      </mat-form-field>

      <button
        color="primary"
        [cdkCopyToClipboard]="url"
        mat-flat-button>
        Copy url
      </button>
    </div>

    <mat-checkbox
      color="primary"
      class="board-position"
      (change)="includePosition($event.checked)"
      >Include position</mat-checkbox
    >

    <mat-button-toggle-group
      *ngIf="isAdmin()"
      class="board-visibility"
      (change)="newVisibility($event.value)"
      [(ngModel)]="visibility"
      aria-label="Board visibility">
      <mat-button-toggle value="private">Only Team</mat-button-toggle>
      <mat-button-toggle value="public"
        >Everyone with the url</mat-button-toggle
      >
    </mat-button-toggle-group>
  `,
  styleUrls: ['./share-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareBoardComponent {
  private store = inject(Store);
  private zoom = this.store.selectSignal(selectZoom);
  private position = this.store.selectSignal(selectPosition);
  private isPublic = this.store.selectSignal(pageFeature.selectIsPublic);

  public isAdmin = this.store.selectSignal(selectIsAdmin);
  public url = '';
  public visibility = 'private';

  constructor() {
    this.url = this.getUrl();
    this.visibility = this.isPublic() ? 'public' : 'private';
  }

  public newVisibility(visibility: string) {
    this.store.dispatch(
      PageActions.setBoardPrivacy({
        isPublic: visibility === 'public',
      }),
    );
  }

  public includePosition(checked: boolean) {
    if (checked) {
      this.url = `${this.getUrl()}?position=${this.position().x},${
        this.position().y
      }&zoom=${this.zoom()}`;
    } else {
      this.url = this.getUrl();
    }
  }

  public getUrl() {
    return window.location.href.split('?')[0];
  }
}
