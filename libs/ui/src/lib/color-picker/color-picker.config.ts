import type Pickr from '@simonwep/pickr';

export const colorPickerSwatches = [
  '#a6caf4',
  '#88e7e3',
  '#92d1b2',
  '#badea7',
  '#a8d672',
  '#cfd45f',
  '#f7d44c',
  '#f4dd8c',
  '#fedeb2',
  '#fbb980',
  '#ffa4ac',
  '#ffb8bf',
  '#d6b4ea',
  '#ecc5f0',
  '#b5b5b5',
  '#000000',
];

export const colorPickerConfig: Partial<Pickr.Options> = {
  theme: 'monolith',
  default: '',
  swatches: colorPickerSwatches,
  components: {
    preview: true,
    opacity: true,
    hue: true,
    interaction: {
      hex: true,
      rgba: true,
      hsla: true,
      hsva: true,
      input: true,
      clear: true,
      save: true,
    },
  },
};
