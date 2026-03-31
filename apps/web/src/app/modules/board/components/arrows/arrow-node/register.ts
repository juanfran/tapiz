export const ARROW_NODE_CONFIG = {
  loadComponent: () =>
    import('./arrow-node.component').then((mod) => mod.ArrowNodeComponent),
};
