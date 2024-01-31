import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Signal,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { TuNode, Vector } from '@team-up/board-commons';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { NodeSpaceComponent } from '../node-space';

@Component({
  selector: 'team-up-vector',
  template: `
    <team-up-node-space
      [node]="node()"
      [enabled]="focus()"
      [rotate]="true"
      [resize]="true">
      <img
        #image
        [attr.src]="node().content.url" />
    </team-up-node-space>
  `,
  styleUrls: ['./vector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, HotkeysService],
  standalone: true,
  imports: [NodeSpaceComponent],
})
export class VectorComponent {
  @Input({ required: true })
  public node!: Signal<TuNode<Vector>>;

  @Input()
  public pasted!: Signal<boolean>;

  @Input({ required: true })
  public focus!: Signal<boolean>;
}
