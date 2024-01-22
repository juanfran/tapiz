export const PANEL_CONFIG = {
  loadComponent: () =>
    import('./panel.component').then((mod) => mod.PanelComponent),
};
