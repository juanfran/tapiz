import { describe, it, expect } from 'vitest';
import { newImage, patchImage } from './image.validator.js';

const validImage = {
  position: { x: 100, y: 200 },
  layer: 1,
  width: 400,
  height: 300,
  url: 'https://example.com/image.png',
  rotation: 0,
};

describe('image.validator', () => {
  it('akzeptiert valides Image mit https URL', () => {
    const result = newImage.safeParse(validImage);
    expect(result.success).toBe(true);
  });

  it('akzeptiert http URL', () => {
    const result = newImage.safeParse({
      ...validImage,
      url: 'http://example.com/image.png',
    });
    expect(result.success).toBe(true);
  });

  it('weist javascript: URL ab', () => {
    const result = newImage.safeParse({
      ...validImage,
      url: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });

  it('weist data: URL ab', () => {
    const result = newImage.safeParse({
      ...validImage,
      url: 'data:text/html,<script>alert(1)</script>',
    });
    expect(result.success).toBe(false);
  });

  it('weist ftp: URL ab', () => {
    const result = newImage.safeParse({
      ...validImage,
      url: 'ftp://example.com/file',
    });
    expect(result.success).toBe(false);
  });

  it('weist URL über 2000 Zeichen ab', () => {
    const result = newImage.safeParse({
      ...validImage,
      url: 'https://example.com/' + 'a'.repeat(2000),
    });
    expect(result.success).toBe(false);
  });

  it('patchImage akzeptiert partielles Update', () => {
    const result = patchImage.safeParse({ rotation: 90 });
    expect(result.success).toBe(true);
  });
});
