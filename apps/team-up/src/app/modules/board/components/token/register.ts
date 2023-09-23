export const PERSONAL_TOKEN_CONFIG = {
  loadComponent: () =>
    import('./token.component').then((mod) => mod.TokenComponent),
};
