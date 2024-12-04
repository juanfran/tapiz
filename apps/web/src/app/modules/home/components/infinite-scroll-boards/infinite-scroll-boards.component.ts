import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { InfiniteScrollDirective } from 'ngx-infinite-scroll';

@Component({
  selector: 'tapiz-infinite-scroll-boards',
  styleUrls: ['./infinite-scroll-boards.component.css'],
  template: `
    <div
      class="main"
      infiniteScroll
      [infiniteScrollDistance]="2"
      [infiniteScrollThrottle]="50"
      [scrollWindow]="false"
      (scrolled)="onScroll()">
      <ng-content></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InfiniteScrollDirective],
})
export class InfiniteScrollBoardsComponent {
  scrolled = output();

  onScroll() {
    this.scrolled.emit();
  }
}
