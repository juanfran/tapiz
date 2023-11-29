export const TEXT_CONFIG = {
  loadComponent: () =>
    import('./text.component').then((mod) => mod.TextComponent),
};
