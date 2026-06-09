import { describe, expect, it } from 'vitest';
import component from './node.component.ts?raw';

describe('NodeComponent z-index styling', () => {
  it('keeps component z-index below CSS highlight priority', () => {
    expect(component).toContain("'[style.--node-z-index]'");
    expect(component).not.toContain("'[style.zIndex]'");
  });
});
