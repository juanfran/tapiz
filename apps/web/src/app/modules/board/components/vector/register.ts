export const VECTOR_CONFIG = {
  loadComponent: () =>
    import('./vector.component').then((mod) => mod.VectorComponent),
};
