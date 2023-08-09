import { router } from '../trpc';
import { teamRouter } from './team-routes';
import { boardRouter } from './board-routes';
import { userRouter } from './user-routes';

export const appRouter = router({
  user: userRouter,
  board: boardRouter,
  team: teamRouter,
});
