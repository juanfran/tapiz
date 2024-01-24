import { router } from '../trpc.js';
import { teamRouter } from './team-routes.js';
import { boardRouter } from './board-routes.js';
import { userRouter } from './user-routes.js';

export const appRouter = router({
  user: userRouter,
  board: boardRouter,
  team: teamRouter,
});
