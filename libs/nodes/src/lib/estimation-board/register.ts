export const ESTIMATION_BOARD_CONFIG = {
  loadComponent: () =>
    import('./estimation-board.component').then(
      (mod) => mod.EstimationBoardComponent
    ),
};
