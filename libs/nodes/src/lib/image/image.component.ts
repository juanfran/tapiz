import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ElementRef,
  ViewChild,
  Signal,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Image, TuNode } from '@team-up/board-commons';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { NodeSpaceComponent } from '../node-space';
import { CommonModule } from '@angular/common';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';

@Component({
  selector: 'team-up-image',
  template: `
    <team-up-node-space
      [node]="node()"
      [enabled]="focus()"
      [rotate]="true"
      [resize]="true">
      <img
        #image
        [attr.src]="node().content.url"
        (load)="loadImage()" />
    </team-up-node-space>
  `,
  styleUrls: ['./image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, HotkeysService],
  standalone: true,
  imports: [CommonModule, NodeSpaceComponent],
  host: {
    '[class.focus]': 'focus()',
  },
})
export class ImageComponent {
  private store = inject(Store);

  @ViewChild('image') public imageRef!: ElementRef;

  @Input({ required: true })
  public node!: Signal<TuNode<Image>>;

  @Input()
  public pasted!: Signal<boolean>;

  @Input({ required: true })
  public focus!: Signal<boolean>;

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
