import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  inject,
  viewChild,
  computed,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Image, TuNode } from '@tapiz/board-commons';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { NodeSpaceComponent } from '../node-space';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { input } from '@angular/core';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'tapiz-image',

  template: `
    <tapiz-node-space
      [node]="node()"
      [showOutline]="focus()"
      [rotate]="true"
      [resize]="true">
      <img
        #image
        [attr.src]="url()"
        (load)="loadImage()" />
    </tapiz-node-space>
  `,
  styleUrls: ['./image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HotkeysService],
  imports: [NodeSpaceComponent],

  host: {
    '[class.focus]': 'focus()',
  },
})
export class ImageComponent {
  #store = inject(Store);
  #configService = inject(ConfigService);

  imageRef = viewChild.required<ElementRef>('image');

  node = input.required<TuNode<Image>>();
  pasted = input.required<boolean>();
  focus = input.required<boolean>();

  url = computed(() => {
    const url = this.node().content.url;

    if (url.startsWith('http')) {
      return url;
    }

    if (url.startsWith('data:')) {
      return url;
    }

    if (this.#configService.config.API_URL.endsWith('/')) {
      return this.#configService.config.API_URL + 'uploads/' + url;
    }

    return this.#configService.config.API_URL + '/uploads/' + url;
  });

  loadImage() {
    const image = this.node();
    const id = image.id;
    const width = image.content.width;
    const height = image.content.height;

    if (!width || !height) {
      this.#store.dispatch(
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

  get imageNativeElement(): HTMLImageElement {
    return this.imageRef().nativeElement;
  }
}
