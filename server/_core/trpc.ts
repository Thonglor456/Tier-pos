import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const STAFF_UNAUTHED_MSG = "กรุณาเข้าสู่ระบบด้วย PIN อีกครั้ง";

/** Any logged-in POS staff (PIN session). */
export const staffProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.staff) throw new TRPCError({ code: "UNAUTHORIZED", message: STAFF_UNAUTHED_MSG });
    return next({ ctx: { ...ctx, staff: ctx.staff } });
  }),
);

/** POS manager or admin. */
export const managerProcedure = staffProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    const role = ctx.staff?.role;
    if (role !== "manager" && role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "เฉพาะผู้จัดการเท่านั้น" });
    }
    return next();
  }),
);

/** POS admin (owner) — sees every branch. */
export const posAdminProcedure = staffProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (ctx.staff?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้น" });
    }
    return next();
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
