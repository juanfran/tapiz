import {
  ChangeDetectionStrategy,
  Component,
  computed,
} from '@angular/core';
import { input } from '@angular/core';
import {
  ArrowHead,
  ArrowNode,
  TuNode,
} from '@tapiz/board-commons';
import { NodeSpaceComponent } from '../../node-space';
import { ArrowConnectorComponent } from '../arrow-connector/arrow-connector.component';

@Component({
  selector: 'tapiz-arrow-node',
  template: `
    <tapiz-node-space
      [node]="node()"
      [showOutline]="focus()"
      [resize]="false"
      [rotate]="false"
      [draggable]="draggable()"
      [cursor]="draggable() ? 'grab' : 'default'">
      <tapiz-arrow-connector
        class="connector"
        [start]="start()"
        [end]="end()"
        [color]="color()"
        [strokeStyle]="strokeStyle()"
        [arrowType]="arrowType()"
        [heads]="heads()" />
    </tapiz-node-space>
  `,
  styleUrls: ['./arrow-node.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeSpaceComponent, ArrowConnectorComponent],
  host: {
    '[class.focus]': 'focus()',
  },
})
export class ArrowNodeComponent {
  node = input.required<TuNode<ArrowNode>>();
  pasted = input.required<boolean>();
  focus = input.required<boolean>();

  start = computed(() => this.node().content.start);
  end = computed(() => this.node().content.end);
  color = computed(() => this.node().content.color ?? '#1c1c1c');
  strokeStyle = computed(
    () => this.node().content.strokeStyle ?? 'solid',
  );
  arrowType = computed(() => this.node().content.arrowType ?? 'sharp');
  heads = computed<ArrowHead[]>(() => {
    return this.node().content.heads ?? ['end'];
  });

  draggable = computed(() => {
    const content = this.node().content;

    return !content.startAttachment && !content.endAttachment;
  });
}
