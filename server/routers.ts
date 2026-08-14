import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import {
  cancelOrder,
  cancelOrderDirect,
  createOrder,
  deleteBranch,
  deletePosUser,
  deleteSalesChannel,
  deleteModifierGroup,
  deleteModifierOption,
  getAllCategoriesAdmin,
  getAllItemsAdmin,
  getAllSalesChannels,
  getBranches,
  getCategories,
  getDailySummary,
  getDashboardMonthlyRevenue,
  getDashboardRecentOrders,
  getDashboardTodaySummary,
  getDashboardTopItems,
  getDashboardWeeklyRevenue,
  getItemsWithVariantsAndModifiers,
  getModifierGroupsWithOptions,
  getOrderWithItems,
  getOrders,
  getOrderQuantitySummary,
  getPosUsers,
  getSalesChannels,
  getStoreSettings,
  toggleItemActive,
  updateStoreSettings,
  upsertBranch,
  upsertCategory,
  upsertItem,
  upsertModifierGroup,
  upsertModifierOption,
  upsertPosUser,
  upsertSalesChannel,
  verifyManagerPin,
  verifyStaffPin,
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
        salesChannel: z.string(),
        paymentMethod: z.enum(["cash", "transfer", "thai_chuay_thai"]),
        totalAmount: z.number(),
        cashReceived: z.number().optional(),
        changeAmount: z.number().optional(),
        vatAmount: z.number().optional(),
        staffId: z.number().optional(),
        branchId: z.number().optional(),
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
    cancelDirect: publicProcedure
      .input(z.object({ orderId: z.number(), cancelReason: z.string() }))
      .mutation(async ({ input }) => {
        await cancelOrderDirect(input.orderId, input.cancelReason);
        return { success: true };
      }),

    getOne: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(({ input }) => getOrderWithItems(input.orderId)),

    list: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        channel: z.string().optional(),
        status: z.enum(["completed", "cancelled"]).optional(),
        staffId: z.number().optional(),
        branchId: z.number().optional(),
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
        branchId: input?.branchId,
      })),

    dailySummary: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(({ input }) => getDailySummary(new Date(input.date))),

    quantitySummary: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        channel: z.string().optional(),
        staffId: z.number().optional(),
        branchId: z.number().optional(),
        paymentMethod: z.enum(["cash", "transfer", "thai_chuay_thai"]).optional(),
        status: z.enum(["completed", "cancelled"]).optional(),
      }))
      .query(({ input }) => getOrderQuantitySummary({
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        channel: input.channel,
        staffId: input.staffId,
        branchId: input.branchId,
        paymentMethod: input.paymentMethod as "cash" | "transfer" | "thai_chuay_thai" | undefined,
        status: input.status,
      })),
  }),

  // ─── POS Users (PIN) ─────────────────────────────────────────────────────────
  posUsers: router({
    list: publicProcedure.query(() => getPosUsers()),
    upsert: publicProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), pinCode: z.string().min(4).max(6), role: z.enum(["staff", "manager"]) }))
      .mutation(({ input }) => upsertPosUser(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePosUser(input.id)),
    verifyPin: publicProcedure
      .input(z.object({ pin: z.string() }))
      .mutation(({ input }) => verifyManagerPin(input.pin)),
    verifyStaffPin: publicProcedure
      .input(z.object({ staffId: z.number(), pin: z.string() }))
      .mutation(({ input }) => verifyStaffPin(input.staffId, input.pin)),
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
        variants: z.array(z.object({ id: z.number().optional(), name: z.string(), priceWalkin: z.number(), priceGrab: z.number(), priceLineman: z.number().optional() })),
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
    upsertModifierGroup: publicProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), isRequired: z.boolean(), minSelect: z.number(), maxSelect: z.number(), sortOrder: z.number() }))
      .mutation(({ input }) => upsertModifierGroup(input)),
    deleteModifierGroup: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteModifierGroup(input.id)),
    upsertModifierOption: publicProcedure
      .input(z.object({ id: z.number().optional(), modifierGroupId: z.number(), name: z.string(), priceAdd: z.number(), sortOrder: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => upsertModifierOption(input)),
    deleteModifierOption: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteModifierOption(input.id)),
  }),

  // ─── Settings ────────────────────────────────────────────────────────────────
  settings: router({
    get: publicProcedure.query(() => getStoreSettings()),
    update: publicProcedure
      .input(z.object({
        shopName: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        taxId: z.string().optional(),
        vatEnabled: z.boolean().optional(),
        vatRate: z.number().optional(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
        promptpayQrUrl: z.string().nullable().optional(),
      }))
      .mutation(({ input }) => updateStoreSettings(input)),
  }),

  // ─── Sales Channels ──────────────────────────────────────────────────────────
  channels: router({
    list: publicProcedure.query(() => getSalesChannels()),
    listAll: publicProcedure.query(() => getAllSalesChannels()),
    upsert: publicProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), slug: z.string(), isActive: z.boolean(), sortOrder: z.number() }))
      .mutation(({ input }) => upsertSalesChannel(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSalesChannel(input.id)),
  }),
  // ─── Branches ────────────────────────────────────────────────────────────────
  branches: router({
    list: publicProcedure.query(() => getBranches()),
    upsert: publicProcedure
      .input(z.object({ id: z.number().optional(), name: z.string().min(1), address: z.string().optional(), phone: z.string().optional(), isActive: z.boolean() }))
      .mutation(({ input }) => upsertBranch(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteBranch(input.id)),
  }),
  // u2500u2500u2500 Dashboard u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  dashboard: router({
    todaySummary: publicProcedure.query(() => getDashboardTodaySummary()),
    topItems: publicProcedure
      .input(z.object({ period: z.enum(["day", "month"]), limit: z.number().optional() }))
      .query(({ input }) => getDashboardTopItems(input.period, input.limit)),
    weeklyRevenue: publicProcedure.query(() => getDashboardWeeklyRevenue()),
    monthlyRevenue: publicProcedure.query(() => getDashboardMonthlyRevenue()),
    recentOrders: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => getDashboardRecentOrders(input.limit)),
  }),

});
export type AppRouter = typeof appRouter;
