export const IMAGE_CONFIG = {
  loadComponent: () =>
    import('./image.component').then((mod) => mod.ImageComponent),
};
