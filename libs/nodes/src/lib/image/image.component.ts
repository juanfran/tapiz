import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Image, TuNode } from '@tapiz/board-commons';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { NodeSpaceComponent } from '../node-space';

import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-image',

  template: `
    <tapiz-node-space
      [node]="node()"
      [enabled]="focus()"
      [rotate]="true"
      [resize]="true">
      <img
        #image
        [attr.src]="node().content.url"
        (load)="loadImage()" />
    </tapiz-node-space>
  `,
  styleUrls: ['./image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, HotkeysService],
  standalone: true,
  imports: [NodeSpaceComponent],

  host: {
    '[class.focus]': 'focus()',
  },
})
export class ImageComponent {
  private store = inject(Store);

  @ViewChild('image') public imageRef!: ElementRef;

  public node = input.required<TuNode<Image>>();

  public pasted = input.required<boolean>();

  public focus = input.required<boolean>();

  public loadImage() {
    const image = this.node();

    const id = image.id;
    const width = image.content.width;
    const height = image.content.height;

    if (!width || !height) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'image',
                id,
                content: {
                  width: this.imageNativeElement.naturalWidth,
                  height: this.imageNativeElement.naturalHeight,
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    }
  }

  public get imageNativeElement() {
    return this.imageRef.nativeElement as HTMLImageElement;
  }
}
