import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import {
  cancelOrder,
  createOrder,
  getAllCategoriesAdmin,
  getAllItemsAdmin,
  getCategories,
  getDailySummary,
  getItemsWithVariantsAndModifiers,
  getModifierGroupsWithOptions,
  getOrderWithItems,
  getOrders,
  getPosUsers,
  toggleItemActive,
  upsertCategory,
  upsertItem,
  upsertPosUser,
  verifyManagerPin,
} from "./db";
import { getSessionCookieOptions as _getCookieOpts } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = _getCookieOpts(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Menu ────────────────────────────────────────────────────────────────────
  menu: router({
    categories: publicProcedure.query(() => getCategories()),
    items: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(({ input }) => getItemsWithVariantsAndModifiers(input?.categoryId)),
    modifierGroups: publicProcedure.query(() => getModifierGroupsWithOptions()),
  }),

  // ─── Orders ──────────────────────────────────────────────────────────────────
  orders: router({
    create: publicProcedure
      .input(z.object({
        salesChannel: z.enum(["walkin", "grab"]),
        paymentMethod: z.enum(["cash", "transfer"]),
        totalAmount: z.number(),
        cashReceived: z.number().optional(),
        changeAmount: z.number().optional(),
        items: z.array(z.object({
          itemId: z.number(),
          variantId: z.number(),
          itemName: z.string(),
          variantName: z.string(),
          quantity: z.number(),
          basePrice: z.number(),
          modifiersPrice: z.number(),
          totalPrice: z.number(),
          modifiers: z.array(z.object({
            modifierOptionId: z.number(),
            modifierGroupName: z.string(),
            modifierName: z.string(),
            priceAdd: z.number(),
          })),
        })),
      }))
      .mutation(({ input }) => createOrder(input)),

    cancel: publicProcedure
      .input(z.object({ orderId: z.number(), pin: z.string(), cancelReason: z.string() }))
      .mutation(async ({ input }) => {
        const manager = await verifyManagerPin(input.pin);
        if (!manager) throw new Error("PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์ผู้จัดการ");
        await cancelOrder(input.orderId, manager.name, input.cancelReason);
        return { success: true };
      }),

    getOne: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(({ input }) => getOrderWithItems(input.orderId)),

    list: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        channel: z.enum(["walkin", "grab"]).optional(),
        status: z.enum(["completed", "cancelled"]).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => getOrders({
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        channel: input?.channel,
        status: input?.status,
        limit: input?.limit,
        offset: input?.offset,
      })),

    dailySummary: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(({ input }) => getDailySummary(new Date(input.date))),
  }),

  // ─── POS Users (PIN) ─────────────────────────────────────────────────────────
  posUsers: router({
    list: publicProcedure.query(() => getPosUsers()),
    upsert: publicProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), pinCode: z.string().min(4).max(6), role: z.enum(["staff", "manager"]) }))
      .mutation(({ input }) => upsertPosUser(input)),
    verifyPin: publicProcedure
      .input(z.object({ pin: z.string() }))
      .mutation(({ input }) => verifyManagerPin(input.pin)),
  }),

  // ─── Admin ───────────────────────────────────────────────────────────────────
  admin: router({
    items: publicProcedure.query(() => getAllItemsAdmin()),
    categories: publicProcedure.query(() => getAllCategoriesAdmin()),
    upsertItem: publicProcedure
      .input(z.object({
        id: z.number().optional(),
        categoryId: z.number(),
        name: z.string(),
        sku: z.string().optional(),
        costPrice: z.number(),
        hasVariants: z.boolean(),
        isActive: z.boolean(),
        sortOrder: z.number(),
        variants: z.array(z.object({ id: z.number().optional(), name: z.string(), priceWalkin: z.number(), priceGrab: z.number() })),
        modifierGroupIds: z.array(z.number()),
      }))
      .mutation(({ input }) => upsertItem(input)),
    toggleItem: publicProcedure
      .input(z.object({ itemId: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => toggleItemActive(input.itemId, input.isActive)),
    upsertCategory: publicProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), sortOrder: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => upsertCategory(input)),
    modifierGroups: publicProcedure.query(() => getModifierGroupsWithOptions()),
  }),
});

export type AppRouter = typeof appRouter;
