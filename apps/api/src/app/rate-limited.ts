import { tAuth } from './trpc.js';
import { AppContext } from './app.context.js';
import { TRPCError } from '@trpc/server';

export const rateLimitedMiddleware = (
  rateLimitName: keyof AppContext['rateLimits'],
) =>
  tAuth.middleware(async ({ ctx, next }) => {
    const checkRateLimit = ctx.rateLimits[rateLimitName];

    if (!checkRateLimit) {
      throw new Error(`Rate limit "${rateLimitName}" not found`);
    }

    const limit = await checkRateLimit(ctx.req);

    if (!limit.isAllowed && limit.isExceeded) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
      });
    }

    return next();
  });
