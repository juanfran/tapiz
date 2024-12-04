import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';

import { ZoneService } from './zone.service';

@Component({
  selector: 'tapiz-zone',
  template: '',
  styleUrls: ['./zone.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': 'areaSelector()',
    '[style.transform]': 'transform()',
    '[style.width.px]': 'width()',
    '[style.height.px]': 'height()',
    '[class.group]': 'areaSelector()?.style === "group"',
    '[class.panel]': 'areaSelector()?.style === "panel"',
    '[class.select]': 'areaSelector()?.style === "select"',
  },
})
export class ZoneComponent {
  #zoneService = inject(ZoneService);

  get areaSelector() {
    return this.#zoneService.areaSelector;
  }

  transform = computed(() => {
    const area = this.areaSelector();

    return area ? `translate(${area.position.x}px, ${area.position.y}px)` : '';
  });

  width = computed(() => {
    const area = this.areaSelector();

    return area ? area.size.width : 0;
  });

  height = computed(() => {
    const area = this.areaSelector();

    return area ? area.size.height : 0;
  });
}
