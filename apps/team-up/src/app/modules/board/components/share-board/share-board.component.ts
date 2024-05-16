import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

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
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'team-up-share-board',
  standalone: true,
  imports: [
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
    @if (isDemo) {
      <div class="demo">
        <p>
          This demo showcases the features of <strong>TeamUp</strong> directly
          in your browser. For the full experience with real-time collaboration,
          please install the app. You can find the installation instructions in
          our
          <a
            target="_blank"
            href="https://github.com/juanfran/team-up/blob/main/INSTALL.md"
            >GitHub repository</a
          >.
        </p>
        <p>Thank you for trying <strong>TeamUp</strong>!</p>
      </div>
    } @else {
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

      @if (isAdmin()) {
        <mat-button-toggle-group
          class="board-visibility"
          (change)="newVisibility($event.value)"
          [(ngModel)]="visibility"
          aria-label="Board visibility">
          <mat-button-toggle value="private">Only Team</mat-button-toggle>
          <mat-button-toggle value="public"
            >Everyone with the url</mat-button-toggle
          >
        </mat-button-toggle-group>
      }
    }
  `,
  styleUrls: ['./share-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareBoardComponent {
  #store = inject(Store);
  #configService = inject(ConfigService);
  #zoom = this.#store.selectSignal(selectZoom);
  #position = this.#store.selectSignal(selectPosition);
  #isPublic = this.#store.selectSignal(pageFeature.selectIsPublic);

  isAdmin = this.#store.selectSignal(selectIsAdmin);
  url = '';
  visibility = 'private';

  constructor() {
    this.url = this.getUrl();
    this.visibility = this.#isPublic() ? 'public' : 'private';
  }

  get isDemo() {
    return !!this.#configService.config.DEMO;
  }

  newVisibility(visibility: string) {
    this.#store.dispatch(
      PageActions.setBoardPrivacy({
        isPublic: visibility === 'public',
      }),
    );
  }

  includePosition(checked: boolean) {
    if (checked) {
      this.url = `${this.getUrl()}?position=${this.#position().x},${
        this.#position().y
      }&zoom=${this.#zoom()}`;
    } else {
      this.url = this.getUrl();
    }
  }

  getUrl() {
    return window.location.href.split('?')[0];
  }
}
