import { Component, computed, input, signal } from '@angular/core';
import { ArrowStrokeWidth, Point } from '@tapiz/board-commons';
import { Arrow } from '@tapiz/board-commons/validators/arrow.validator';
import { buildArrowPath, buildVisibleArrowPath } from '../arrow-path';

type HeadPos = 'start' | 'end';

// <tapiz-arrow-connector
//   [start]="{ x: 40, y: 20 }"
//   [end]="{ x: 80, y: 140 }"
//   color="#000"
//   strokeStyle="solid"
//   arrowType="elbow"
//   [heads]="['start', 'end']" />

@Component({
  selector: 'tapiz-arrow-connector',
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      [attr.width]="width()"
      [attr.height]="height()"
      style="overflow:visible"
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker
          [attr.id]="markerId()"
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto-start-reverse"
          markerUnits="strokeWidth">
          <path
            d="M0,0 L8,4 L0,8 L2.2,4 Z"
            [attr.fill]="color()" />
        </marker>
      </defs>

      <path
        class="hit-path"
        [attr.d]="pathD()"
        fill="none"
        stroke="transparent"
        [attr.stroke-width]="hitStrokeWidth"
        [attr.stroke-linecap]="'round'"
        [attr.stroke-linejoin]="'round'" />

      <path
        class="visible-path"
        [attr.d]="visiblePathD()"
        fill="none"
        [attr.stroke]="color()"
        [attr.stroke-width]="strokeWidth()"
        [attr.stroke-linecap]="'round'"
        [attr.stroke-linejoin]="'round'"
        [attr.stroke-dasharray]="dasharray()" />

      <path
        class="marker-path"
        [attr.d]="pathD()"
        fill="none"
        stroke="transparent"
        [attr.stroke-width]="strokeWidth()"
        [attr.marker-start]="hasStartHead() ? 'url(#' + markerId() + ')' : null"
        [attr.marker-end]="hasEndHead() ? 'url(#' + markerId() + ')' : null" />
    </svg>
  `,
  styles: `
    :host,
    svg {
      pointer-events: none;
    }

    .hit-path {
      cursor: pointer;
      pointer-events: stroke;
    }

    .visible-path,
    .marker-path {
      pointer-events: none;
    }
  `,
})
export class ArrowConnectorComponent {
  readonly start = input<Arrow['start']>({ x: 0, y: 0 });
  readonly end = input<Arrow['end']>({ x: 100, y: 50 });
  readonly color = input<Arrow['color']>('black');
  readonly strokeStyle = input<Arrow['strokeStyle']>('solid');
  readonly strokeWidth = input<ArrowStrokeWidth>(2);
  readonly arrowType = input<Arrow['arrowType']>('sharp');
  readonly heads = input<HeadPos[]>(['end']);
  readonly startTangent = input<Point | null>(null);
  readonly endTangent = input<Point | null>(null);

  protected readonly hitStrokeWidth = 16;
  private readonly arrowHeadLineInset = computed(() => {
    return this.strokeWidth() * (8 - 2.2);
  });
  private static _uid = 0;
  private readonly _id = ++ArrowConnectorComponent._uid;
  protected markerId = signal(`arrow-head-${this._id}`);

  private readonly pad = 10;

  private readonly s = computed(() => this.start());
  private readonly e = computed(() => this.end());

  private readonly minX = computed(
    () => Math.min(this.s().x, this.e().x) - this.pad,
  );
  private readonly minY = computed(
    () => Math.min(this.s().y, this.e().y) - this.pad,
  );
  private readonly maxX = computed(
    () => Math.max(this.s().x, this.e().x) + this.pad,
  );
  private readonly maxY = computed(
    () => Math.max(this.s().y, this.e().y) + this.pad,
  );

  protected readonly width = computed(() =>
    Math.max(1, this.maxX() - this.minX()),
  );
  protected readonly height = computed(() =>
    Math.max(1, this.maxY() - this.minY()),
  );
  protected readonly viewBox = computed(
    () => `0 0 ${this.width()} ${this.height()}`,
  );

  private readonly lsx = computed(() => this.s().x - this.minX());
  private readonly lsy = computed(() => this.s().y - this.minY());
  private readonly lex = computed(() => this.e().x - this.minX());
  private readonly ley = computed(() => this.e().y - this.minY());

  protected readonly hasStartHead = computed(() =>
    this.heads().includes('start'),
  );
  protected readonly hasEndHead = computed(() => this.heads().includes('end'));

  protected readonly dasharray = computed(() => {
    switch (this.strokeStyle()) {
      case 'dashed':
        return '6 6';
      case 'dotted':
        return '1 6';
      default:
        return null; // solid
    }
  });

  protected readonly pathD = computed(() =>
    buildArrowPath(this.localStart(), this.localEnd(), this.pathOptions()),
  );

  protected readonly visiblePathD = computed(() =>
    buildVisibleArrowPath(
      this.localStart(),
      this.localEnd(),
      this.pathOptions(),
    ),
  );

  private readonly localStart = computed(() => ({
    x: this.lsx(),
    y: this.lsy(),
  }));
  private readonly localEnd = computed(() => ({
    x: this.lex(),
    y: this.ley(),
  }));
  private readonly pathOptions = computed(() => ({
    arrowType: this.arrowType(),
    startTangent: this.startTangent(),
    endTangent: this.endTangent(),
    hasStartHead: this.hasStartHead(),
    hasEndHead: this.hasEndHead(),
    arrowHeadLineInset: this.arrowHeadLineInset(),
  }));
}
