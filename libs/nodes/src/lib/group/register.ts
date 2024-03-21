export const GROUP_CONFIG = {
  loadComponent: () =>
    import('./group.component').then((mod) => mod.GroupComponent),
};
