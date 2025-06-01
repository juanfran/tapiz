import { z } from 'zod/v4';
import {
  protectedProcedure,
  teamProcedure,
  router,
  teamAdminProcedure,
  teamMemberProcedure,
  boardProcedure,
  boardAdminProcedure,
  boardMemberProcedure,
} from '../app/trpc.js';

export const testRouter = router({
  protected: protectedProcedure.query((req) => {
    return {
      input: req.input,
      ctx: req.ctx,
    };
  }),
  team: teamProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query((req) => {
      return {
        input: req.input,
        ctx: req.ctx,
      };
    }),
  teamAdmin: teamAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query((req) => {
      return {
        input: req.input,
        ctx: req.ctx,
      };
    }),
  teamMember: teamMemberProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query((req) => {
      return {
        input: req.input,
        ctx: req.ctx,
      };
    }),
  board: boardProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
      }),
    )
    .query((req) => {
      return {
        input: req.input,
        ctx: req.ctx,
      };
    }),
  boardAdmin: boardAdminProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
      }),
    )
    .query((req) => {
      return {
        input: req.input,
        ctx: req.ctx,
      };
    }),
  boardMember: boardMemberProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
      }),
    )
    .query((req) => {
      return {
        input: req.input,
        ctx: req.ctx,
      };
    }),
});
