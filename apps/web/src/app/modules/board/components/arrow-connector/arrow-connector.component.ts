import { Component, computed, input, signal } from '@angular/core';

type Point = { x: number; y: number };
type StrokeStyle = 'solid' | 'dashed' | 'dotted';
type ArrowType = 'sharp' | 'curved' | 'elbow';
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
  standalone: true,
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
          refX="4"
          refY="4"
          orient="auto-start-reverse"
          markerUnits="strokeWidth">
          <path
            d="M0,0 L8,4 L0,8 L2.2,4 Z"
            [attr.fill]="color()" />
        </marker>
      </defs>

      <path
        [attr.d]="pathD()"
        fill="none"
        [attr.stroke]="color()"
        [attr.stroke-width]="strokeWidth"
        [attr.stroke-linecap]="'round'"
        [attr.stroke-linejoin]="'round'"
        [attr.stroke-dasharray]="dasharray()"
        [attr.marker-start]="hasStartHead() ? 'url(#' + markerId() + ')' : null"
        [attr.marker-end]="hasEndHead() ? 'url(#' + markerId() + ')' : null" />
    </svg>
  `,
})
export class ArrowConnectorComponent {
  readonly start = input<Point>({ x: 0, y: 0 });
  readonly end = input<Point>({ x: 100, y: 50 });
  readonly color = input<string>('black');
  readonly strokeStyle = input<StrokeStyle>('solid');
  readonly arrowType = input<ArrowType>('sharp');
  readonly heads = input<HeadPos[]>(['end']);

  protected readonly strokeWidth = 2;
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

  protected readonly pathD = computed(() => {
    const sx = this.lsx(),
      sy = this.lsy();
    const ex = this.lex(),
      ey = this.ley();

    // Si los puntos coinciden, dibujamos un segmento mínimo para que se vea algo.
    if (sx === ex && sy === ey) {
      return `M ${sx} ${sy} l 0.01 0`;
    }

    switch (this.arrowType()) {
      case 'curved': {
        const dx = ex - sx;
        const dy = ey - sy;
        // Control points: curvatura suave basada en dx/dy
        const c1x = sx + dx * 0.3;
        const c1y = sy + dy * 0.0;
        const c2x = ex - dx * 0.3;
        const c2y = ey - dy * 0.0;
        return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
      }
      case 'elbow': {
        // Codo ortogonal: primero horizontal, después vertical (o viceversa si compensa)
        const useHV = Math.abs(ex - sx) >= Math.abs(ey - sy); // decide patrón
        if (useHV) {
          return `M ${sx} ${sy} L ${ex} ${sy} L ${ex} ${ey}`;
        } else {
          return `M ${sx} ${sy} L ${sx} ${ey} L ${ex} ${ey}`;
        }
      }
      case 'sharp':
      default:
        return `M ${sx} ${sy} L ${ex} ${ey}`;
    }
  });
}
