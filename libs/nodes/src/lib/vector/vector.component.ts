import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TuNode, Vector } from '@team-up/board-commons';
import { NodeSpaceComponent } from '../node-space';
import { input } from '@angular/core';

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
  standalone: true,
  imports: [NodeSpaceComponent],
})
export class VectorComponent {
  public node = input.required<TuNode<Vector>>();

  public pasted = input.required<boolean>();

  public focus = input.required<boolean>();
}
