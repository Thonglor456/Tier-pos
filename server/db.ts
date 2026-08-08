import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { InsertUser } from "../drizzle/schema";
import {
  categories,
  itemModifierGroups,
  itemVariants,
  items,
  modifierGroups,
  modifierOptions,
  orderItemModifiers,
  orderItems,
  orders,
  posUsers,
  salesChannels,
  storeSettings,
  users,
} from "../drizzle/schema";
import { branches } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Auth Users ───────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
}

export async function getItemsWithVariantsAndModifiers(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  const where = categoryId
    ? and(eq(items.isActive, true), eq(items.categoryId, categoryId))
    : eq(items.isActive, true);
  const itemList = await db.select().from(items).where(where).orderBy(items.sortOrder);
  if (itemList.length === 0) return [];
  const itemIds = itemList.map((i) => i.id);
  const [variantRows, modMappingRows] = await Promise.all([
    db.select().from(itemVariants).where(and(eq(itemVariants.isActive, true))),
    db.select({ itemId: itemModifierGroups.itemId, modifierGroupId: itemModifierGroups.modifierGroupId })
      .from(itemModifierGroups),
  ]);
  const variantsByItem = new Map<number, typeof variantRows>();
  for (const v of variantRows) {
    if (!itemIds.includes(v.itemId)) continue;
    if (!variantsByItem.has(v.itemId)) variantsByItem.set(v.itemId, []);
    variantsByItem.get(v.itemId)!.push(v);
  }
  const modGroupIdsByItem = new Map<number, number[]>();
  for (const m of modMappingRows) {
    if (!itemIds.includes(m.itemId)) continue;
    if (!modGroupIdsByItem.has(m.itemId)) modGroupIdsByItem.set(m.itemId, []);
    modGroupIdsByItem.get(m.itemId)!.push(m.modifierGroupId);
  }
  return itemList.map((item) => ({
    ...item,
    variants: (variantsByItem.get(item.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    modifierGroupIds: modGroupIdsByItem.get(item.id) ?? [],
  }));
}

export async function getModifierGroupsWithOptions() {
  const db = await getDb();
  if (!db) return [];
  const groups = await db.select().from(modifierGroups).orderBy(modifierGroups.sortOrder);
  const options = await db.select().from(modifierOptions).where(eq(modifierOptions.isActive, true)).orderBy(modifierOptions.sortOrder);
  return groups.map((g) => ({
    ...g,
    options: options.filter((o) => o.modifierGroupId === g.id),
  }));
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const db = await getDb();
  if (!db) return `TIER-${date}-0001`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const count = await db.select({ count: sql<number>`count(*)` }).from(orders).where(gte(orders.createdAt, todayStart));
  const seq = String((count[0]?.count ?? 0) + 1).padStart(4, "0");
  return `TIER-${date}-${seq}`;
}

export type CreateOrderInput = {
  salesChannel: string;
  paymentMethod: "cash" | "transfer" | "thai_chuay_thai";
  totalAmount: number;
  cashReceived?: number;
  changeAmount?: number;
  vatAmount?: number;
  staffId?: number;
  branchId?: number;
  items: Array<{
    itemId: number;
    variantId: number;
    itemName: string;
    variantName: string;
    quantity: number;
    basePrice: number;
    modifiersPrice: number;
    totalPrice: number;
    modifiers: Array<{ modifierOptionId: number; modifierGroupName: string; modifierName: string; priceAdd: number }>;
  }>;
};

export async function createOrder(input: CreateOrderInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const orderNumber = await generateOrderNumber();
  await db.insert(orders).values({
    orderNumber,
    salesChannel: input.salesChannel,
    status: "completed",
    totalAmount: String(input.totalAmount),
    paymentMethod: input.paymentMethod,
    cashReceived: input.cashReceived != null ? String(input.cashReceived) : null,
    changeAmount: input.changeAmount != null ? String(input.changeAmount) : null,
    vatAmount: input.vatAmount != null ? String(input.vatAmount) : "0",
    staffId: input.staffId ?? null,
    branchId: input.branchId ?? null,
  });
  const [newOrder] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!newOrder) throw new Error("Failed to create order");
  for (const item of input.items) {
    await db.insert(orderItems).values({
      orderId: newOrder.id,
      itemId: item.itemId,
      variantId: item.variantId,
      itemName: item.itemName,
      variantName: item.variantName,
      quantity: item.quantity,
      basePrice: String(item.basePrice),
      modifiersPrice: String(item.modifiersPrice),
      totalPrice: String(item.totalPrice),
    });
    const [newItem] = await db.select().from(orderItems)
      .where(and(eq(orderItems.orderId, newOrder.id), eq(orderItems.itemId, item.itemId), eq(orderItems.variantId, item.variantId)))
      .orderBy(desc(orderItems.id)).limit(1);
    if (newItem && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        await db.insert(orderItemModifiers).values({
          orderItemId: newItem.id,
          modifierOptionId: mod.modifierOptionId,
          modifierGroupName: mod.modifierGroupName,
          modifierName: mod.modifierName,
          priceAdd: String(mod.priceAdd),
        });
      }
    }
  }
  return newOrder;
}

export async function cancelOrder(orderId: number, cancelledBy: string, cancelReason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({
    status: "cancelled",
    cancelledBy,
    cancelReason,
    cancelledAt: new Date(),
  }).where(eq(orders.id, orderId));
}

export async function getOrderWithItems(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const oi = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const oiWithMods = await Promise.all(oi.map(async (item) => {
    const mods = await db!.select().from(orderItemModifiers).where(eq(orderItemModifiers.orderItemId, item.id));
    return { ...item, modifiers: mods };
  }));
  return { ...order, items: oiWithMods };
}

export async function getOrders(opts: { startDate?: Date; endDate?: Date; channel?: string; status?: "completed" | "cancelled"; staffId?: number; branchId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts.startDate) conditions.push(gte(orders.createdAt, opts.startDate));
  if (opts.endDate) {
    // Extend endDate to end-of-day (23:59:59.999) so all orders on that day are included
    const endOfDay = new Date(opts.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.createdAt, endOfDay));
  }
  if (opts.channel) conditions.push(eq(orders.salesChannel, opts.channel));
  if (opts.status) conditions.push(eq(orders.status, opts.status));
  if (opts.staffId) conditions.push(eq(orders.staffId, opts.staffId));
  if (opts.branchId) conditions.push(eq(orders.branchId, opts.branchId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function getDailySummary(date: Date) {
  const db = await getDb();
  if (!db) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 86400000);
  const allOrders = await db.select().from(orders).where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
  const completed = allOrders.filter((o) => o.status === "completed");
  const cancelled = allOrders.filter((o) => o.status === "cancelled");
  const totalRevenue = completed.reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);
  const walkinRevenue = completed.filter((o) => o.salesChannel === "walkin").reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);
  const grabRevenue = completed.filter((o) => o.salesChannel === "grab").reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);
  const cashRevenue = completed.filter((o) => o.paymentMethod === "cash").reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);
  const transferRevenue = completed.filter((o) => o.paymentMethod === "transfer").reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);
  const thaiChuayThaiRevenue = completed.filter((o) => o.paymentMethod === "thai_chuay_thai").reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);
  // By channel (dynamic)
  const channelBreakdown: Record<string, number> = {};
  for (const o of completed) {
    channelBreakdown[o.salesChannel] = (channelBreakdown[o.salesChannel] ?? 0) + parseFloat(String(o.totalAmount));
  }
  // By staff
  const staffBreakdown: Record<number, { revenue: number; count: number }> = {};
  for (const o of completed) {
    if (o.staffId) {
      if (!staffBreakdown[o.staffId]) staffBreakdown[o.staffId] = { revenue: 0, count: 0 };
      staffBreakdown[o.staffId]!.revenue += parseFloat(String(o.totalAmount));
      staffBreakdown[o.staffId]!.count += 1;
    }
  }
  return {
    totalRevenue, walkinRevenue, grabRevenue, cashRevenue, transferRevenue, thaiChuayThaiRevenue,
    channelBreakdown, staffBreakdown,
    completedCount: completed.length, cancelledCount: cancelled.length,
  };
}

// ─── POS Users (PIN) ──────────────────────────────────────────────────────────
export async function verifyManagerPin(pin: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(posUsers).where(and(eq(posUsers.pinCode, pin), eq(posUsers.role, "manager"), eq(posUsers.isActive, true))).limit(1);
  return result[0] ?? null;
}

export async function verifyStaffPin(staffId: number, pin: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(posUsers).where(and(eq(posUsers.id, staffId), eq(posUsers.pinCode, pin), eq(posUsers.isActive, true))).limit(1);
  return result[0] ?? null;
}

export async function deletePosUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(posUsers).where(eq(posUsers.id, id));
}

export async function getPosUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posUsers).orderBy(posUsers.id);
}

export async function upsertPosUser(data: { id?: number; name: string; pinCode: string; role: "staff" | "manager" }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(posUsers).set({ name: data.name, pinCode: data.pinCode, role: data.role }).where(eq(posUsers.id, data.id));
  } else {
    await db.insert(posUsers).values({ name: data.name, pinCode: data.pinCode, role: data.role });
  }
}

// ─── Admin: Items ─────────────────────────────────────────────────────────────
export async function getAllItemsAdmin() {
  const db = await getDb();
  if (!db) return [];
  const itemList = await db.select().from(items).orderBy(items.categoryId, items.sortOrder);
  const variantRows = await db.select().from(itemVariants);
  const modMappings = await db.select().from(itemModifierGroups);
  return itemList.map((item) => ({
    ...item,
    variants: variantRows.filter((v) => v.itemId === item.id).sort((a, b) => a.sortOrder - b.sortOrder),
    modifierGroupIds: modMappings.filter((m) => m.itemId === item.id).map((m) => m.modifierGroupId),
  }));
}

export async function upsertItem(data: {
  id?: number; categoryId: number; name: string; sku?: string; costPrice: number; hasVariants: boolean; isActive: boolean; sortOrder: number;
  variants: Array<{ id?: number; name: string; priceWalkin: number; priceGrab: number; priceLineman?: number }>;
  modifierGroupIds: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  let itemId = data.id;
  if (itemId) {
    await db.update(items).set({ categoryId: data.categoryId, name: data.name, sku: data.sku ?? null, costPrice: String(data.costPrice), hasVariants: data.hasVariants, isActive: data.isActive, sortOrder: data.sortOrder }).where(eq(items.id, itemId));
  } else {
    await db.insert(items).values({ categoryId: data.categoryId, name: data.name, sku: data.sku ?? null, costPrice: String(data.costPrice), hasVariants: data.hasVariants, isActive: data.isActive, sortOrder: data.sortOrder });
    const [newItem] = await db.select().from(items).orderBy(desc(items.id)).limit(1);
    itemId = newItem!.id;
  }
  // Sync variants
  const existingVariants = await db.select().from(itemVariants).where(eq(itemVariants.itemId, itemId));
  const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id!);
  for (const ev of existingVariants) {
    if (!incomingIds.includes(ev.id)) await db.delete(itemVariants).where(eq(itemVariants.id, ev.id));
  }
  for (let i = 0; i < data.variants.length; i++) {
    const v = data.variants[i]!;
    if (v.id) {
      await db.update(itemVariants).set({ name: v.name, priceWalkin: String(v.priceWalkin), priceGrab: String(v.priceGrab), priceLineman: String(v.priceLineman ?? v.priceGrab), sortOrder: i }).where(eq(itemVariants.id, v.id));
    } else {
      await db.insert(itemVariants).values({ itemId, name: v.name, priceWalkin: String(v.priceWalkin), priceGrab: String(v.priceGrab), priceLineman: String(v.priceLineman ?? v.priceGrab), sortOrder: i });
    }
  }
  // Sync modifier groups
  await db.delete(itemModifierGroups).where(eq(itemModifierGroups.itemId, itemId));
  for (const mgId of data.modifierGroupIds) {
    await db.insert(itemModifierGroups).values({ itemId, modifierGroupId: mgId });
  }
  return itemId;
}

export async function toggleItemActive(itemId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(items).set({ isActive }).where(eq(items.id, itemId));
}

export async function getAllCategoriesAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.sortOrder);
}

export async function upsertCategory(data: { id?: number; name: string; sortOrder: number; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(categories).set({ name: data.name, sortOrder: data.sortOrder, isActive: data.isActive }).where(eq(categories.id, data.id));
  } else {
    await db.insert(categories).values({ name: data.name, sortOrder: data.sortOrder, isActive: data.isActive });
  }
}

// ─── Store Settings ───────────────────────────────────────────────────────────
export async function getStoreSettings() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeSettings).limit(1);
  return result[0] ?? null;
}

export async function updateStoreSettings(data: Partial<{
  shopName: string; logoUrl: string | null; address: string; phone: string; taxId: string;
  vatEnabled: boolean; vatRate: number; openTime: string; closeTime: string; promptpayQrUrl: string | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(storeSettings).limit(1);
  if (existing.length === 0) {
    await db.insert(storeSettings).values({ shopName: "Tier Coffee", vatEnabled: false, vatRate: "7.00" });
  }
  const setData: Record<string, unknown> = {};
  if (data.shopName !== undefined) setData.shopName = data.shopName;
  if (data.logoUrl !== undefined) setData.logoUrl = data.logoUrl;
  if (data.address !== undefined) setData.address = data.address;
  if (data.phone !== undefined) setData.phone = data.phone;
  if (data.taxId !== undefined) setData.taxId = data.taxId;
  if (data.vatEnabled !== undefined) setData.vatEnabled = data.vatEnabled;
  if (data.vatRate !== undefined) setData.vatRate = String(data.vatRate);
  if (data.openTime !== undefined) setData.openTime = data.openTime;
  if (data.closeTime !== undefined) setData.closeTime = data.closeTime;
  if (data.promptpayQrUrl !== undefined) setData.promptpayQrUrl = data.promptpayQrUrl;
  await db.update(storeSettings).set(setData);
}

// ─── Sales Channels ───────────────────────────────────────────────────────────
export async function getSalesChannels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salesChannels).where(eq(salesChannels.isActive, true)).orderBy(salesChannels.sortOrder);
}

export async function getAllSalesChannels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salesChannels).orderBy(salesChannels.sortOrder);
}

export async function upsertSalesChannel(data: { id?: number; name: string; slug: string; isActive: boolean; sortOrder: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(salesChannels).set({ name: data.name, slug: data.slug, isActive: data.isActive, sortOrder: data.sortOrder }).where(eq(salesChannels.id, data.id));
  } else {
    await db.insert(salesChannels).values({ name: data.name, slug: data.slug, isActive: data.isActive, sortOrder: data.sortOrder });
  }
}

export async function deleteSalesChannel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(salesChannels).where(eq(salesChannels.id, id));
}

// ─── Modifier Groups Admin ────────────────────────────────────────────────────
export async function upsertModifierGroup(data: { id?: number; name: string; isRequired: boolean; minSelect: number; maxSelect: number; sortOrder: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(modifierGroups).set({ name: data.name, isRequired: data.isRequired, minSelect: data.minSelect, maxSelect: data.maxSelect, sortOrder: data.sortOrder }).where(eq(modifierGroups.id, data.id));
  } else {
    await db.insert(modifierGroups).values({ name: data.name, isRequired: data.isRequired, minSelect: data.minSelect, maxSelect: data.maxSelect, sortOrder: data.sortOrder });
  }
}

export async function deleteModifierGroup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(modifierOptions).where(eq(modifierOptions.modifierGroupId, id));
  await db.delete(itemModifierGroups).where(eq(itemModifierGroups.modifierGroupId, id));
  await db.delete(modifierGroups).where(eq(modifierGroups.id, id));
}

export async function upsertModifierOption(data: { id?: number; modifierGroupId: number; name: string; priceAdd: number; sortOrder: number; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(modifierOptions).set({ name: data.name, priceAdd: String(data.priceAdd), sortOrder: data.sortOrder, isActive: data.isActive }).where(eq(modifierOptions.id, data.id));
  } else {
    await db.insert(modifierOptions).values({ modifierGroupId: data.modifierGroupId, name: data.name, priceAdd: String(data.priceAdd), sortOrder: data.sortOrder, isActive: data.isActive });
  }
}

export async function deleteModifierOption(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(modifierOptions).where(eq(modifierOptions.id, id));
}
// ─── Branches ─────────────────────────────────────────────────────────────────
export async function getBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(branches.id);
}
export async function upsertBranch(input: { id?: number; name: string; address?: string; phone?: string; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (input.id) {
    await db.update(branches).set({ name: input.name, address: input.address ?? null, phone: input.phone ?? null, isActive: input.isActive }).where(eq(branches.id, input.id));
    return input.id;
  } else {
    const [result] = await db.insert(branches).values({ name: input.name, address: input.address ?? null, phone: input.phone ?? null, isActive: input.isActive });
    return (result as { insertId: number }).insertId;
  }
}
export async function deleteBranch(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(branches).where(eq(branches.id, id));
}

export async function cancelOrderDirect(orderId: number, cancelReason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({
    status: "cancelled",
    cancelledBy: "พนักงาน",
    cancelReason,
    cancelledAt: new Date(),
  }).where(eq(orders.id, orderId));
}
