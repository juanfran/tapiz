function luminance(r: number, g: number, b: number) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function contrast(color1: string, color2: string) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (rgb1 && rgb2) {
    const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  return 0;
}

const tokenPalette = [
  '#FF7F7F',
  '#7FAAFF',
  '#FFFF7F',
  '#7FFF7F',
  '#FFBF7F',
  '#BF7FBF',
  '#7FBFBF',
  '#FF7FAA',
  '#FFAA7F',
  '#AABF7F',
  '#BF7F7F',
  '#7F7FAA',
  '#BFBFAA',
  '#FFAAFF',
  '#AA7F7F',
  '#AAFFBF',
  '#7FAABF',
  '#FFBFBE',
] as const;

export const TokenColors = tokenPalette.map((backgroundColor) => {
  const color =
    contrast(backgroundColor, '#ffffff') > 2 ? '#ffffff' : '#000000';
  return { backgroundColor, color };
});

export function tokenColorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = hash * 31 + id.charCodeAt(i);
    hash = hash % Number.MAX_SAFE_INTEGER;
  }
  return TokenColors[Math.abs(hash) % TokenColors.length];
}

export function lighter(hex: string, percentage: number) {
  const colorRGB = hexToRgb(hex);

  if (colorRGB) {
    colorRGB.r += Math.round(((255 - colorRGB.r) * percentage) / 100);
    colorRGB.g += Math.round(((255 - colorRGB.g) * percentage) / 100);
    colorRGB.b += Math.round(((255 - colorRGB.b) * percentage) / 100);

    return (
      '#' +
      ('0' + colorRGB.r.toString(16)).slice(-2) +
      ('0' + colorRGB.g.toString(16)).slice(-2) +
      ('0' + colorRGB.b.toString(16)).slice(-2)
    );
  }

  return '#ffffff';
}
