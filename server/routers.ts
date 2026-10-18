import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { STOCK_MOVEMENT_TYPES } from "../drizzle/schema";
import {
  getProfitAndLoss,
  getReconciliationCalendar,
  getReconciliationDay,
  saveReconciliation,
} from "./accounting";
import {
  cancelOrder,
  createOrder,
  deleteBranch,
  deletePosUser,
  deleteSalesChannel,
  deleteModifierGroup,
  deleteModifierOption,
  getActivePosUser,
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
  getDashboardTopItemsWithVariant,
  getDashboardWeeklyRevenue,
  getDashboardHourlyRevenue,
  getDashboardMonthComparison,
  getDashboardBranchComparison,
  getLoginPosUsers,
  getOrderItemsByIds,
  getItemsWithVariantsAndModifiers,
  getModifierGroupsWithOptions,
  getOrderWithItems,
  getOrders,
  getOrderQuantitySummary,
  getPosUserRole,
  getPosUsers,
  getSalesChannels,
  getStoreSettings,
  toggleItemActive,
  updateItemPrices,
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
import {
  cancelTransfer,
  createTransfer,
  getBranch,
  listWarehouses,
  withdrawStock,
  getRecipeOverview,
  getStockLevels,
  getTransfer,
  listIngredients,
  listMovements,
  listTransfers,
  receiveStock,
  receiveTransfer,
  recordWaste,
  setItemRecipe,
  setModifierRecipe,
  submitStockCount,
  upsertIngredient,
} from "./stock";
import { businessDateRange } from "./stockCalc";
import { getSessionCookieOptions as _getCookieOpts } from "./_core/cookies";
import {
  assertNotLocked,
  recordPinResult,
  requireBranch,
  scopeBranch,
  signStaffToken,
  type StaffSession,
} from "./_core/staffAuth";
import { managerProcedure, posAdminProcedure, publicProcedure, router, staffProcedure } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD");
const qty = z.number().finite();

function clientKey(req: { ip?: string; headers?: Record<string, unknown> }) {
  const fwd = req.headers?.["x-forwarded-for"];
  return String(Array.isArray(fwd) ? fwd[0] : fwd ?? req.ip ?? "unknown").split(",")[0]!.trim();
}

/** คนที่ผูกสาขาไว้เปิดดูหรือยกเลิกบิลของสาขาอื่นไม่ได้ */
function assertOrderVisible(staff: StaffSession, order: { branchId: number | null } | null) {
  if (!order) return;
  const scoped = scopeBranch(staff, order.branchId);
  if (scoped !== undefined && order.branchId !== scoped) {
    throw new TRPCError({ code: "FORBIDDEN", message: "บิลนี้เป็นของสาขาอื่น" });
  }
}

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
    categories: staffProcedure.query(() => getCategories()),
    items: staffProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(({ input }) => getItemsWithVariantsAndModifiers(input?.categoryId)),
    modifierGroups: staffProcedure.query(() => getModifierGroupsWithOptions()),
    // หน้าแก้ราคา: พนักงานทุกคนแก้ราคาได้ แต่แก้ส่วนอื่นของเมนูไม่ได้
    updatePrices: staffProcedure
      .input(z.object({
        itemId: z.number(),
        cupsPerServing: z.number().int().min(1).max(10),
        variants: z.array(z.object({ id: z.number(), priceWalkin: z.number().min(0), priceGrab: z.number().min(0), priceLineman: z.number().min(0) })),
      }))
      .mutation(({ input }) => updateItemPrices(input)),
  }),

  // ─── Orders ──────────────────────────────────────────────────────────────────
  orders: router({
    create: staffProcedure
      .input(z.object({
        salesChannel: z.string(),
        paymentMethod: z.enum(["cash", "transfer", "thai_chuay_thai"]),
        totalAmount: z.number(),
        discountAmount: z.number().optional(),
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
          quantity: z.number().int().positive(),
          basePrice: z.number(),
          modifiersPrice: z.number(),
          totalPrice: z.number(),
          modifiers: z.array(z.object({
            modifierOptionId: z.number(),
            modifierGroupName: z.string(),
            modifierName: z.string(),
            priceAdd: z.number(),
          })),
        })).min(1),
      }))
      // พนักงานและสาขาของบิลมาจาก session ไม่ใช่จากที่เครื่องส่งมา
      .mutation(({ input, ctx }) => createOrder({
        ...input,
        staffId: ctx.staff.id,
        branchId: scopeBranch(ctx.staff, input.branchId),
      })),

    cancel: staffProcedure
      .input(z.object({ orderId: z.number(), pin: z.string(), cancelReason: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const key = `mgr:${clientKey(ctx.req)}`;
        assertNotLocked(key);
        const manager = await verifyManagerPin(input.pin);
        recordPinResult(key, !!manager);
        if (!manager) throw new Error("PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์ผู้จัดการ");
        assertOrderVisible(ctx.staff, await getOrderWithItems(input.orderId));
        await cancelOrder(input.orderId, manager.name, input.cancelReason);
        return { success: true };
      }),
    // ยกเลิกจากหน้ารายงาน: พนักงานทุกคนยกเลิกบิลสาขาตัวเองได้ และบันทึกชื่อจริงของผู้ยกเลิก
    cancelDirect: staffProcedure
      .input(z.object({ orderId: z.number(), cancelReason: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        assertOrderVisible(ctx.staff, await getOrderWithItems(input.orderId));
        await cancelOrder(input.orderId, ctx.staff.name, input.cancelReason);
        return { success: true };
      }),

    getOne: staffProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const order = await getOrderWithItems(input.orderId);
        assertOrderVisible(ctx.staff, order);
        return order;
      }),

    list: staffProcedure
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
      .query(({ input, ctx }) => getOrders({
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        channel: input?.channel,
        status: input?.status,
        staffId: input?.staffId,
        limit: input?.limit,
        offset: input?.offset,
        branchId: scopeBranch(ctx.staff, input?.branchId),
      })),

    dailySummary: staffProcedure
      .input(z.object({ date: z.string(), branchId: z.number().optional() }))
      .query(({ input, ctx }) => getDailySummary(new Date(input.date), scopeBranch(ctx.staff, input.branchId))),

    quantitySummary: staffProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        channel: z.string().optional(),
        staffId: z.number().optional(),
        branchId: z.number().optional(),
        paymentMethod: z.enum(["cash", "transfer", "thai_chuay_thai"]).optional(),
        status: z.enum(["completed", "cancelled"]).optional(),
      }))
      .query(({ input, ctx }) => getOrderQuantitySummary({
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        channel: input.channel,
        staffId: input.staffId,
        branchId: scopeBranch(ctx.staff, input.branchId),
        paymentMethod: input.paymentMethod,
        status: input.status,
      })),
    itemsByIds: staffProcedure
      .input(z.object({ orderIds: z.array(z.number()) }))
      .query(({ input, ctx }) => getOrderItemsByIds(input.orderIds, scopeBranch(ctx.staff))),
  }),

  // ─── POS Users (PIN) ─────────────────────────────────────────────────────────
  posUsers: router({
    // หน้าเข้าสู่ระบบ: ชื่อและสิทธิ์เท่านั้น ไม่มี PIN
    loginList: publicProcedure.query(() => getLoginPosUsers()),
    list: staffProcedure.query(() => getPosUsers()),
    upsert: managerProcedure
      .input(z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        pinCode: z.string().regex(/^\d{4,6}$/, "PIN ต้องเป็นตัวเลข 4–6 หลัก").optional().or(z.literal("")),
        role: z.enum(["staff", "manager", "admin"]),
        branchId: z.number().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        // ผู้จัดการตั้งหรือแก้บัญชีแอดมินไม่ได้ (กันการยกสิทธิ์ตัวเอง)
        if (ctx.staff.role !== "admin") {
          const currentRole = input.id ? await getPosUserRole(input.id) : null;
          if (input.role === "admin" || currentRole === "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการบัญชีแอดมินได้" });
          }
        }
        return upsertPosUser({ ...input, pinCode: input.pinCode || undefined });
      }),
    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.id === ctx.staff.id) throw new Error("ลบบัญชีของตัวเองไม่ได้");
        if (ctx.staff.role !== "admin" && (await getPosUserRole(input.id)) === "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้นที่ลบบัญชีแอดมินได้" });
        }
        return deletePosUser(input.id);
      }),
    verifyPin: staffProcedure
      .input(z.object({ pin: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const key = `mgr:${clientKey(ctx.req)}`;
        assertNotLocked(key);
        const manager = await verifyManagerPin(input.pin);
        recordPinResult(key, !!manager);
        return manager ? { id: manager.id, name: manager.name, role: manager.role } : null;
      }),
    // เข้าสู่ระบบ: ถูกต้องแล้วได้ token ที่เครื่องต้องแนบมากับทุกคำขอ
    verifyStaffPin: publicProcedure
      .input(z.object({ staffId: z.number(), pin: z.string() }))
      .mutation(async ({ input }) => {
        const key = `staff:${input.staffId}`;
        assertNotLocked(key);
        const user = await verifyStaffPin(input.staffId, input.pin);
        recordPinResult(key, !!user);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          role: user.role,
          branchId: user.branchId ?? null,
          token: await signStaffToken(user.id),
        };
      }),
    me: staffProcedure.query(async ({ ctx }) => {
      const user = await getActivePosUser(ctx.staff.id);
      return user ? { id: user.id, name: user.name, role: user.role, branchId: user.branchId ?? null } : null;
    }),
  }),

  // ─── Admin ───────────────────────────────────────────────────────────────────
  admin: router({
    items: managerProcedure.query(() => getAllItemsAdmin()),
    categories: managerProcedure.query(() => getAllCategoriesAdmin()),
    upsertItem: managerProcedure
      .input(z.object({
        id: z.number().optional(),
        categoryId: z.number(),
        name: z.string(),
        sku: z.string().optional(),
        costPrice: z.number(),
        hasVariants: z.boolean(),
        cupsPerServing: z.number().int().min(1).optional(),
        isActive: z.boolean(),
        sortOrder: z.number(),
        variants: z.array(z.object({ id: z.number().optional(), name: z.string(), priceWalkin: z.number(), priceGrab: z.number(), priceLineman: z.number().optional() })),
        modifierGroupIds: z.array(z.number()),
      }))
      .mutation(({ input }) => upsertItem(input)),
    toggleItem: managerProcedure
      .input(z.object({ itemId: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => toggleItemActive(input.itemId, input.isActive)),
    upsertCategory: managerProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), sortOrder: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => upsertCategory(input)),
    modifierGroups: managerProcedure.query(() => getModifierGroupsWithOptions()),
    upsertModifierGroup: managerProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), isRequired: z.boolean(), minSelect: z.number(), maxSelect: z.number(), sortOrder: z.number() }))
      .mutation(({ input }) => upsertModifierGroup(input)),
    deleteModifierGroup: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteModifierGroup(input.id)),
    upsertModifierOption: managerProcedure
      .input(z.object({ id: z.number().optional(), modifierGroupId: z.number(), name: z.string(), priceAdd: z.number(), sortOrder: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => upsertModifierOption(input)),
    deleteModifierOption: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteModifierOption(input.id)),
  }),

  // ─── Settings ────────────────────────────────────────────────────────────────
  settings: router({
    get: staffProcedure.query(() => getStoreSettings()),
    update: managerProcedure
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
    list: staffProcedure.query(() => getSalesChannels()),
    listAll: managerProcedure.query(() => getAllSalesChannels()),
    upsert: managerProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), slug: z.string(), isActive: z.boolean(), sortOrder: z.number(), gpPercent: z.number().min(0).max(100).optional() }))
      .mutation(({ input }) => upsertSalesChannel(input)),
    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSalesChannel(input.id)),
  }),
  // ─── Branches ────────────────────────────────────────────────────────────────
  branches: router({
    // หน้าเข้าสู่ระบบต้องใช้ชื่อสาขา
    list: publicProcedure.query(() => getBranches()),
    upsert: managerProcedure
      .input(z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean(),
        type: z.enum(["shop", "warehouse"]).optional(),
        usesCentralStock: z.boolean().optional(),
      }))
      .mutation(({ input }) => upsertBranch(input)),
    delete: posAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteBranch(input.id)),
  }),
  // ─── Dashboard ───────────────────────────────────────────────────────────────
  dashboard: router({
    todaySummary: managerProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(({ input, ctx }) => getDashboardTodaySummary(scopeBranch(ctx.staff, input?.branchId))),
    topItems: posAdminProcedure
      .input(z.object({ period: z.enum(["day", "month"]), limit: z.number().optional() }))
      .query(({ input }) => getDashboardTopItems(input.period, input.limit)),
    topItemsWithVariant: managerProcedure
      .input(z.object({ period: z.enum(["day", "month"]), limit: z.number().optional(), branchId: z.number().optional() }))
      .query(({ input, ctx }) => getDashboardTopItemsWithVariant(input.period, input.limit, scopeBranch(ctx.staff, input.branchId))),
    weeklyRevenue: managerProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(({ input, ctx }) => getDashboardWeeklyRevenue(scopeBranch(ctx.staff, input?.branchId))),
    monthlyRevenue: managerProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(({ input, ctx }) => getDashboardMonthlyRevenue(scopeBranch(ctx.staff, input?.branchId))),
    hourlyRevenue: managerProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(({ input, ctx }) => getDashboardHourlyRevenue(scopeBranch(ctx.staff, input?.branchId))),
    monthComparison: managerProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(({ input, ctx }) => getDashboardMonthComparison(scopeBranch(ctx.staff, input?.branchId))),
    branchComparison: posAdminProcedure.query(() => getDashboardBranchComparison()),
    recentOrders: managerProcedure
      .input(z.object({ limit: z.number().optional(), branchId: z.number().optional() }))
      .query(({ input, ctx }) => getDashboardRecentOrders(input.limit, scopeBranch(ctx.staff, input.branchId))),
  }),

  // ─── Stock ───────────────────────────────────────────────────────────────────
  stock: router({
    ingredients: staffProcedure.query(() => listIngredients()),
    upsertIngredient: managerProcedure
      .input(z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        unit: z.string().min(1).max(20),
        costPerUnit: z.number().min(0),
        reorderLevel: z.number().min(0),
        isActive: z.boolean(),
      }))
      .mutation(({ input }) => upsertIngredient(input)),
    recipes: managerProcedure.query(() => getRecipeOverview()),
    setItemRecipe: managerProcedure
      .input(z.object({
        itemId: z.number(),
        lines: z.array(z.object({ variantId: z.number().nullable(), ingredientId: z.number(), quantity: qty.positive() })),
      }))
      .mutation(({ input }) => setItemRecipe(input.itemId, input.lines)),
    setModifierRecipe: managerProcedure
      .input(z.object({
        modifierOptionId: z.number(),
        lines: z.array(z.object({ ingredientId: z.number(), quantity: qty })),
      }))
      .mutation(({ input }) => setModifierRecipe(input.modifierOptionId, input.lines)),

    // สาขาเห็นสต็อกตัวเอง + ของที่มีในคลังกลาง (จะได้รู้ว่าเบิกอะไรได้บ้าง)
    levels: staffProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const branchId = scopeBranch(ctx.staff, input?.branchId);
        if (!branchId) return getStockLevels();
        const branch = await getBranch(branchId);
        const warehouses = branch?.type === "shop" && branch.usesCentralStock ? await listWarehouses() : [];
        return getStockLevels([branchId, ...warehouses.map((w) => w.id)]);
      }),
    warehouses: staffProcedure.query(() => listWarehouses()),
    withdraw: staffProcedure
      .input(z.object({
        kind: z.enum(["withdrawal", "return"]),
        branchId: z.number().optional(),
        warehouseId: z.number().optional(),
        note: z.string().optional(),
        lines: z.array(z.object({ ingredientId: z.number(), quantity: qty.positive() })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        let branchId = input.branchId;
        let warehouseId = input.warehouseId;
        if (ctx.staff.role !== "admin" && ctx.staff.branchId) {
          const own = await getBranch(ctx.staff.branchId);
          // คนประจำคลังบันทึกแทนสาขาได้ / คนของสาขาบันทึกได้เฉพาะสาขาตัวเอง
          if (own?.type === "warehouse") warehouseId = own.id;
          else branchId = ctx.staff.branchId;
        }
        if (!branchId) throw new Error("กรุณาเลือกสาขา");
        warehouseId ??= (await listWarehouses())[0]?.id;
        if (!warehouseId) throw new Error("ยังไม่ได้ตั้งคลังกลาง (ตั้งค่า → สาขา)");
        return withdrawStock({ ...input, branchId, warehouseId, staffId: ctx.staff.id });
      }),

    receive: staffProcedure
      .input(z.object({
        branchId: z.number().optional(),
        note: z.string().optional(),
        lines: z.array(z.object({ ingredientId: z.number(), quantity: qty.positive(), totalCost: z.number().min(0) })).min(1),
      }))
      .mutation(({ input, ctx }) => receiveStock({ ...input, branchId: requireBranch(ctx.staff, input.branchId), staffId: ctx.staff.id })),
    waste: staffProcedure
      .input(z.object({
        branchId: z.number().optional(),
        note: z.string().min(1, "กรุณาระบุสาเหตุ"),
        lines: z.array(z.object({ ingredientId: z.number(), quantity: qty.positive() })).min(1),
      }))
      .mutation(({ input, ctx }) => recordWaste({ ...input, branchId: requireBranch(ctx.staff, input.branchId), staffId: ctx.staff.id })),
    count: staffProcedure
      .input(z.object({
        branchId: z.number().optional(),
        note: z.string().optional(),
        lines: z.array(z.object({ ingredientId: z.number(), countedQuantity: qty.min(0) })).min(1),
      }))
      .mutation(({ input, ctx }) => submitStockCount({ ...input, branchId: requireBranch(ctx.staff, input.branchId), staffId: ctx.staff.id })),

    transfers: staffProcedure
      .input(z.object({ branchId: z.number().optional(), kinds: z.array(z.enum(["transfer", "withdrawal", "return"])).optional() }).optional())
      .query(({ input, ctx }) => listTransfers(scopeBranch(ctx.staff, input?.branchId), 50, input?.kinds)),
    createTransfer: staffProcedure
      .input(z.object({
        fromBranchId: z.number().optional(),
        toBranchId: z.number(),
        note: z.string().optional(),
        lines: z.array(z.object({ ingredientId: z.number(), quantity: qty.positive() })).min(1),
      }))
      .mutation(({ input, ctx }) => createTransfer({ ...input, fromBranchId: requireBranch(ctx.staff, input.fromBranchId), staffId: ctx.staff.id })),
    receiveTransfer: staffProcedure
      .input(z.object({
        transferId: z.number(),
        lines: z.array(z.object({ lineId: z.number(), receivedQuantity: qty.min(0) })),
      }))
      .mutation(async ({ input, ctx }) => {
        const t = await getTransfer(input.transferId);
        if (!t) throw new Error("ไม่พบรายการโอน");
        // สาขาปลายทางเป็นคนกดรับ (แอดมินกดแทนได้)
        if (scopeBranch(ctx.staff, t.toBranchId) !== t.toBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "สาขาปลายทางเท่านั้นที่กดรับของได้" });
        }
        return receiveTransfer({ ...input, staffId: ctx.staff.id });
      }),
    cancelTransfer: staffProcedure
      .input(z.object({ transferId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const t = await getTransfer(input.transferId);
        if (!t) throw new Error("ไม่พบรายการโอน");
        if (scopeBranch(ctx.staff, t.fromBranchId) !== t.fromBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "สาขาต้นทางเท่านั้นที่ยกเลิกได้" });
        }
        return cancelTransfer(input.transferId, ctx.staff.id);
      }),

    movements: staffProcedure
      .input(z.object({
        branchId: z.number().optional(),
        from: dateStr,
        to: dateStr,
        type: z.enum(STOCK_MOVEMENT_TYPES).optional(),
        ingredientId: z.number().optional(),
      }))
      .query(({ input, ctx }) => {
        const { start, end } = businessDateRange(input.from, input.to);
        return listMovements({ ...input, start, end, branchId: scopeBranch(ctx.staff, input.branchId) });
      }),
  }),

  // ─── Accounting ──────────────────────────────────────────────────────────────
  accounting: router({
    reconciliationDay: managerProcedure
      .input(z.object({ branchId: z.number().optional(), date: dateStr }))
      .query(({ input, ctx }) => getReconciliationDay(requireBranch(ctx.staff, input.branchId), input.date)),
    reconciliationCalendar: managerProcedure
      .input(z.object({ branchId: z.number().optional(), from: dateStr, to: dateStr }))
      .query(({ input, ctx }) => getReconciliationCalendar(requireBranch(ctx.staff, input.branchId), input.from, input.to)),
    saveReconciliation: managerProcedure
      .input(z.object({
        branchId: z.number().optional(),
        date: dateStr,
        source: z.string().min(1),
        actualNet: z.number().min(0),
        feeAmount: z.number().min(0).optional(),
        note: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => saveReconciliation({
        branchId: requireBranch(ctx.staff, input.branchId),
        businessDate: input.date,
        source: input.source,
        actualNet: input.actualNet,
        feeAmount: input.feeAmount,
        note: input.note,
        staffId: ctx.staff.id,
      })),
    profitAndLoss: managerProcedure
      .input(z.object({ branchId: z.number().optional(), from: dateStr, to: dateStr }))
      .query(({ input, ctx }) => getProfitAndLoss({ branchId: scopeBranch(ctx.staff, input.branchId), from: input.from, to: input.to })),
  }),
});
export type AppRouter = typeof appRouter;
