import { TRPCError } from '@trpc/server';
import { AdminRequiredConflict } from '../db/admin-conflict.js';

/** Maps AdminRequiredConflict from the database layer to a CONFLICT. */
export async function asConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AdminRequiredConflict) {
      throw new TRPCError({ code: 'CONFLICT' });
    }
    throw error;
  }
}
