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
  selector: 'tapiz-arrow-node',

  template: `
    <tapiz-node-space
      [node]="node()"
      [showOutline]="focus()"
      [rotate]="true"
      [resize]="true">
      <p>Arrow Node</p>
    </tapiz-node-space>
  `,
  styleUrls: ['./arrow-node.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HotkeysService],
  imports: [NodeSpaceComponent],

  host: {
    '[class.focus]': 'focus()',
  },
})
export class ArrowNodeComponent {
  #store = inject(Store);
  #configService = inject(ConfigService);

  imageRef = viewChild.required<ElementRef>('image');

  node = input.required<TuNode<Image>>();
  pasted = input.required<boolean>();
  focus = input.required<boolean>();
}
