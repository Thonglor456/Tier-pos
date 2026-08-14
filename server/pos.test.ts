import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCategories: vi.fn().mockResolvedValue([
      { id: 1, name: "กาแฟ", sortOrder: 1, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: "ชา", sortOrder: 2, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]),
    getItemsWithVariantsAndModifiers: vi.fn().mockResolvedValue([
      { id: 1, name: "คาปูชิโน่", categoryId: 1, isActive: true, hasVariants: true, sku: "CAP-001", costPrice: "15", sortOrder: 1, createdAt: new Date(), updatedAt: new Date(), variants: [{ id: 1, itemId: 1, name: "ร้อน", priceWalkin: "45", priceGrab: "65", isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() }], modifierGroupIds: [1] },
    ]),
    getModifierGroupsWithOptions: vi.fn().mockResolvedValue([
      { id: 1, name: "ระดับความหวาน", isRequired: true, minSelect: 1, maxSelect: 1, sortOrder: 1, createdAt: new Date(), updatedAt: new Date(), options: [{ id: 1, modifierGroupId: 1, name: "หวาน 100%", priceAdd: "0", sortOrder: 1, isActive: true, createdAt: new Date() }] },
    ]),
    verifyManagerPin: vi.fn().mockImplementation(async (pin: string) => {
      if (pin === "1234") return { id: 1, name: "ผู้จัดการ", pinCode: "1234", role: "manager", isActive: true, createdAt: new Date(), updatedAt: new Date() };
      return null;
    }),
    createOrder: vi.fn().mockResolvedValue({ id: 1, orderNumber: "TIER-20260808-0001", salesChannel: "walkin", status: "completed", totalAmount: "45", paymentMethod: "cash", cashReceived: "50", changeAmount: "5", cancelledBy: null, cancelReason: null, cancelledAt: null, createdAt: new Date(), updatedAt: new Date() }),
    cancelOrder: vi.fn().mockResolvedValue(undefined),
    getDailySummary: vi.fn().mockResolvedValue({ totalRevenue: 1000, walkinRevenue: 700, grabRevenue: 300, cashRevenue: 600, transferRevenue: 400, completedCount: 10, cancelledCount: 1 }),
    getOrders: vi.fn().mockResolvedValue([]),
    getOrderQuantitySummary: vi.fn().mockResolvedValue({
      totalCups: 18,
      channelBreakdown: {
        walkin: { cupsSold: 10, orderCount: 6, revenue: 450 },
        grab: { cupsSold: 5, orderCount: 3, revenue: 325 },
        lineman: { cupsSold: 3, orderCount: 2, revenue: 195 },
      },
    }),
    getPosUsers: vi.fn().mockResolvedValue([]),
    upsertPosUser: vi.fn().mockResolvedValue(undefined),
    getAllItemsAdmin: vi.fn().mockResolvedValue([]),
    getAllCategoriesAdmin: vi.fn().mockResolvedValue([]),
    upsertItem: vi.fn().mockResolvedValue(1),
    toggleItemActive: vi.fn().mockResolvedValue(undefined),
    upsertCategory: vi.fn().mockResolvedValue(undefined),
  };
});

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("menu router", () => {
  it("returns categories", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.menu.categories();
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("กาแฟ");
  });

  it("returns items with variants", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.menu.items({});
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("คาปูชิโน่");
    expect(result[0]?.variants).toHaveLength(1);
  });

  it("returns modifier groups with options", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.menu.modifierGroups();
    expect(result[0]?.name).toBe("ระดับความหวาน");
    expect(result[0]?.isRequired).toBe(true);
    expect(result[0]?.options).toHaveLength(1);
  });
});

describe("orders router", () => {
  it("creates an order successfully", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.orders.create({
      salesChannel: "walkin",
      paymentMethod: "cash",
      totalAmount: 45,
      cashReceived: 50,
      changeAmount: 5,
      items: [{
        itemId: 1, variantId: 1, itemName: "คาปูชิโน่", variantName: "ร้อน",
        quantity: 1, basePrice: 45, modifiersPrice: 0, totalPrice: 45,
        modifiers: [{ modifierOptionId: 1, modifierGroupName: "ระดับความหวาน", modifierName: "หวาน 100%", priceAdd: 0 }],
      }],
    });
    expect(result.orderNumber).toBe("TIER-20260808-0001");
    expect(result.status).toBe("completed");
  });

  it("returns daily summary", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.orders.dailySummary({ date: "2026-08-08" });
    expect(result?.totalRevenue).toBe(1000);
    expect(result?.completedCount).toBe(10);
  });

  it("returns cups sold and keeps Grab and LINE MAN as separate channels", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.orders.quantitySummary({
      startDate: "2026-08-01",
      endDate: "2026-08-08",
    });
    expect(result.totalCups).toBe(18);
    expect(result.channelBreakdown.grab).toEqual({ cupsSold: 5, orderCount: 3, revenue: 325 });
    expect(result.channelBreakdown.lineman).toEqual({ cupsSold: 3, orderCount: 2, revenue: 195 });
    expect(result.channelBreakdown.grab).not.toEqual(result.channelBreakdown.lineman);
  });
});

describe("posUsers router - PIN verification", () => {
  it("verifies correct manager PIN", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.posUsers.verifyPin({ pin: "1234" });
    expect(result).not.toBeNull();
    expect(result?.role).toBe("manager");
  });

  it("rejects wrong PIN", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.posUsers.verifyPin({ pin: "9999" });
    expect(result).toBeNull();
  });
});

describe("orders router - cancel with PIN", () => {
  it("cancels order with valid manager PIN", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.orders.cancel({ orderId: 1, pin: "1234", cancelReason: "ลูกค้าเปลี่ยนใจ" });
    expect(result.success).toBe(true);
  });

  it("rejects cancellation with wrong PIN", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.orders.cancel({ orderId: 1, pin: "0000", cancelReason: "test" })).rejects.toThrow();
  });
});
