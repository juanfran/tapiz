import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TNode, Vector } from '@tapiz/board-commons';
import { NodeSpaceComponent } from '../node-space';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-vector',

  template: `
    <tapiz-node-space
      [node]="node()"
      [showOutline]="focus()"
      [rotate]="true"
      [resize]="true">
      <img
        #image
        [attr.src]="node().content.url" />
    </tapiz-node-space>
  `,
  styleUrls: ['./vector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeSpaceComponent],
})
export class VectorComponent {
  public node = input.required<TNode<Vector>>();

  public pasted = input.required<boolean>();

  public focus = input.required<boolean>();
}
