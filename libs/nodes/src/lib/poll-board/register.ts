export const POLL_BOARD_CONFIG = {
  loadComponent: () =>
    import('./poll-board.component').then((mod) => mod.PollBoardComponent),
};
