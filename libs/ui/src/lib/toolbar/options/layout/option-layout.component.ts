import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { NodeToolbar } from '../../node-toolbar.model';
import { ColorPickerComponent } from '../../../color-picker';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'tapiz-toolbar-option-layout',
  template: `
    <div class="field">
      <label class="color-picker-layout">
        Background color

        <tapiz-color-picker
          [color]="node().content.backgroundColor"
          (changed)="updateNodeValue($event, 'backgroundColor')" />
      </label>
    </div>

    <div class="field">
      <label class="color-picker-layout">
        Border color

        <tapiz-color-picker
          [color]="node().content.borderColor"
          (changed)="updateNodeValue($event, 'borderColor')" />
      </label>
    </div>

    <div class="field">
      <label class="input-layout">
        Border radius
        <mat-slider
          min="0"
          max="100"
          step="1">
          <input
            matSliderThumb
            [value]="node().content.borderRadius ?? 0"
            (valueChange)="updateNodeValue($event, 'borderRadius')" />
        </mat-slider>
      </label>
    </div>

    <div class="field">
      <label class="input-layout">
        Border width

        <mat-slider
          min="1"
          max="100"
          step="1">
          <input
            matSliderThumb
            [value]="node().content.borderWidth ?? 0"
            (valueChange)="updateNodeValue($event, 'borderWidth')" />
        </mat-slider>
      </label>
    </div>

    <div class="field">
      <label class="color-picker-layout">
        Note color

        <tapiz-color-picker
          [color]="node().content.color"
          (changed)="updateNodeValue($event, 'color')" />
      </label>
    </div>
  `,
  styleUrls: ['../options.scss', './option-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ColorPickerComponent, MatSliderModule],
})
export class OptionLayoutComponent {
  #store = inject(Store);

  node = input.required<TuNode<NodeToolbar>>();

  updateNode(event: Event, key: keyof NodeToolbar) {
    const target = event.target as HTMLInputElement;
    const isNumber = target.type === 'number';

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          {
            op: 'patch',
            data: {
              id: this.node().id,
              type: this.node().type,
              content: {
                [key]: isNumber ? Number(target.value) : target.value,
              },
            },
          },
        ],
      }),
    );
  }

  updateNodeValue(value: string | number | undefined, key: keyof NodeToolbar) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          {
            op: 'patch',
            data: {
              id: this.node().id,
              type: this.node().type,
              content: {
                [key]: value ?? null,
              },
            },
          },
        ],
      }),
    );
  }
}
