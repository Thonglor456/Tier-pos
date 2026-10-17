import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import {
  branchStock,
  branches,
  ingredients,
  itemVariants,
  items,
  modifierOptions,
  modifierRecipeLines,
  recipeLines,
  stockMovements,
  stockTransferLines,
  stockTransfers,
  type StockMovementType,
} from "../drizzle/schema";
import { getDb } from "./db";
import { computeConsumption, movingAverageCost, num, round3, stockLevel } from "./stockCalc";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbLike = Db | Tx;

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db;
}

type MovementInput = {
  branchId: number;
  ingredientId: number;
  type: StockMovementType;
  quantity: number; // signed
  unitCost: number;
  orderId?: number | null;
  transferId?: number | null;
  note?: string | null;
  staffId?: number | null;
};

/** บันทึกความเคลื่อนไหวและปรับยอดคงเหลือของสาขา (ต้องเรียกภายใน transaction) */
async function applyMovements(tx: DbLike, movements: MovementInput[]) {
  for (const m of movements) {
    const qty = round3(m.quantity);
    if (qty === 0) continue;
    await tx.insert(stockMovements).values({
      branchId: m.branchId,
      ingredientId: m.ingredientId,
      type: m.type,
      quantity: String(qty),
      unitCost: String(m.unitCost),
      orderId: m.orderId ?? null,
      transferId: m.transferId ?? null,
      note: m.note ?? null,
      staffId: m.staffId ?? null,
    });
    await tx.insert(branchStock)
      .values({ branchId: m.branchId, ingredientId: m.ingredientId, quantity: String(qty) })
      .onDuplicateKeyUpdate({ set: { quantity: sql`\`quantity\` + ${String(qty)}` } });
  }
}

async function costMap(tx: DbLike, ingredientIds?: number[]) {
  const rows = ingredientIds && ingredientIds.length > 0
    ? await tx.select({ id: ingredients.id, cost: ingredients.costPerUnit }).from(ingredients).where(inArray(ingredients.id, ingredientIds))
    : await tx.select({ id: ingredients.id, cost: ingredients.costPerUnit }).from(ingredients);
  return new Map(rows.map((r) => [r.id, num(r.cost)]));
}

async function onHand(tx: DbLike, branchId: number, ingredientId: number, forUpdate = false) {
  const q = tx.select({ quantity: branchStock.quantity }).from(branchStock)
    .where(and(eq(branchStock.branchId, branchId), eq(branchStock.ingredientId, ingredientId)));
  const [row] = forUpdate ? await q.for("update") : await q;
  return num(row?.quantity);
}

// ─── Sales ───────────────────────────────────────────────────────────────────
/**
 * ตัดวัตถุดิบตามสูตรของทุกรายการในบิล แล้วคืนต้นทุนของบิล
 * เมนูที่ยังไม่มีสูตรใช้ items.costPrice เป็นต้นทุนแทน (ไม่ตัดสต็อก)
 * บิลที่ไม่มีสาขา (เครื่องยังไม่ได้ตั้งสาขา) คิดต้นทุนแต่ไม่ตัดสต็อก
 */
export async function deductStockForOrder(tx: DbLike, input: {
  orderId: number;
  branchId: number | null;
  staffId: number | null;
  lines: Array<{ itemId: number; variantId: number; quantity: number; modifierOptionIds: number[] }>;
}): Promise<number> {
  if (input.lines.length === 0) return 0;
  const itemIds = Array.from(new Set(input.lines.map((l) => l.itemId)));
  const optionIds = Array.from(new Set(input.lines.flatMap((l) => l.modifierOptionIds)));
  const [recipeRows, modRows, itemRows] = await Promise.all([
    tx.select().from(recipeLines).where(inArray(recipeLines.itemId, itemIds)),
    optionIds.length > 0
      ? tx.select().from(modifierRecipeLines).where(inArray(modifierRecipeLines.modifierOptionId, optionIds))
      : Promise.resolve([]),
    tx.select({ id: items.id, costPrice: items.costPrice }).from(items).where(inArray(items.id, itemIds)),
  ]);
  const fallback = new Map(itemRows.map((r) => [r.id, num(r.costPrice)]));
  const costs = await costMap(tx, Array.from(new Set([...recipeRows, ...modRows].map((r) => r.ingredientId))));
  const { usage, cost } = computeConsumption(
    input.lines.map((l) => ({ ...l, fallbackUnitCost: fallback.get(l.itemId) ?? 0 })),
    recipeRows.map((r) => ({ itemId: r.itemId, variantId: r.variantId, ingredientId: r.ingredientId, quantity: num(r.quantity) })),
    modRows.map((r) => ({ modifierOptionId: r.modifierOptionId, ingredientId: r.ingredientId, quantity: num(r.quantity) })),
    costs,
  );
  if (input.branchId) {
    await applyMovements(tx, Array.from(usage.entries()).map(([ingredientId, qty]) => ({
      branchId: input.branchId!,
      ingredientId,
      type: "sale" as const,
      quantity: -qty,
      unitCost: costs.get(ingredientId) ?? 0,
      orderId: input.orderId,
      staffId: input.staffId,
    })));
  }
  return cost;
}

/** คืนวัตถุดิบของบิลที่ถูกยกเลิก ด้วยจำนวนและต้นทุนเดียวกับตอนตัด */
export async function reverseStockForOrder(tx: DbLike, orderId: number) {
  const sold = await tx.select().from(stockMovements)
    .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.type, "sale")));
  await applyMovements(tx, sold.map((m) => ({
    branchId: m.branchId,
    ingredientId: m.ingredientId,
    type: "sale_cancel" as const,
    quantity: -num(m.quantity),
    unitCost: num(m.unitCost),
    orderId,
    note: "คืนสต็อกจากบิลที่ยกเลิก",
  })));
}

// ─── Ingredients ─────────────────────────────────────────────────────────────
export async function listIngredients() {
  const db = await requireDb();
  return db.select().from(ingredients).orderBy(ingredients.name);
}

export async function upsertIngredient(data: { id?: number; name: string; unit: string; costPerUnit: number; reorderLevel: number; isActive: boolean }) {
  const db = await requireDb();
  const values = {
    name: data.name,
    unit: data.unit,
    costPerUnit: String(data.costPerUnit),
    reorderLevel: String(data.reorderLevel),
    isActive: data.isActive,
  };
  if (data.id) {
    await db.update(ingredients).set(values).where(eq(ingredients.id, data.id));
    return data.id;
  }
  const [res] = await db.insert(ingredients).values(values);
  return (res as { insertId: number }).insertId;
}

// ─── Recipes ─────────────────────────────────────────────────────────────────
export async function getRecipeOverview() {
  const db = await requireDb();
  const [itemRows, variantRows, lineRows, optionRows, modLineRows] = await Promise.all([
    db.select({ id: items.id, name: items.name, categoryId: items.categoryId, costPrice: items.costPrice, isActive: items.isActive }).from(items).orderBy(items.categoryId, items.sortOrder),
    db.select({ id: itemVariants.id, itemId: itemVariants.itemId, name: itemVariants.name }).from(itemVariants).where(eq(itemVariants.isActive, true)).orderBy(itemVariants.sortOrder),
    db.select().from(recipeLines),
    db.select({ id: modifierOptions.id, name: modifierOptions.name, modifierGroupId: modifierOptions.modifierGroupId }).from(modifierOptions).where(eq(modifierOptions.isActive, true)),
    db.select().from(modifierRecipeLines),
  ]);
  return {
    items: itemRows.map((it) => ({
      ...it,
      variants: variantRows.filter((v) => v.itemId === it.id),
      lines: lineRows.filter((l) => l.itemId === it.id),
    })),
    modifierOptions: optionRows.map((o) => ({ ...o, lines: modLineRows.filter((l) => l.modifierOptionId === o.id) })),
  };
}

export async function setItemRecipe(itemId: number, lines: Array<{ variantId: number | null; ingredientId: number; quantity: number }>) {
  const db = await requireDb();
  await db.transaction(async (tx) => {
    await tx.delete(recipeLines).where(eq(recipeLines.itemId, itemId));
    for (const l of lines) {
      if (l.quantity === 0) continue;
      await tx.insert(recipeLines).values({ itemId, variantId: l.variantId, ingredientId: l.ingredientId, quantity: String(l.quantity) });
    }
  });
}

export async function setModifierRecipe(modifierOptionId: number, lines: Array<{ ingredientId: number; quantity: number }>) {
  const db = await requireDb();
  await db.transaction(async (tx) => {
    await tx.delete(modifierRecipeLines).where(eq(modifierRecipeLines.modifierOptionId, modifierOptionId));
    for (const l of lines) {
      if (l.quantity === 0) continue;
      await tx.insert(modifierRecipeLines).values({ modifierOptionId, ingredientId: l.ingredientId, quantity: String(l.quantity) });
    }
  });
}

// ─── Stock levels ────────────────────────────────────────────────────────────
/**
 * คงเหลือของทุกวัตถุดิบ แยกตามสาขา
 * branchIds ว่าง = ทุกสาขาที่เปิดอยู่; คลังกลางเรียงไว้หน้าสุดเสมอ
 */
export async function getStockLevels(branchIds?: number[]) {
  const db = await requireDb();
  const only = branchIds && branchIds.length > 0 ? branchIds : null;
  const [ingRows, branchRowsRaw, stockRows] = await Promise.all([
    db.select().from(ingredients).where(eq(ingredients.isActive, true)).orderBy(ingredients.name),
    db.select({ id: branches.id, name: branches.name, type: branches.type }).from(branches)
      .where(only ? inArray(branches.id, only) : eq(branches.isActive, true)).orderBy(branches.id),
    only ? db.select().from(branchStock).where(inArray(branchStock.branchId, only)) : db.select().from(branchStock),
  ]);
  const branchRows = [...branchRowsRaw].sort((a, b) => (a.type === b.type ? a.id - b.id : a.type === "warehouse" ? -1 : 1));
  const qty = new Map(stockRows.map((r) => [`${r.branchId}:${r.ingredientId}`, num(r.quantity)]));
  return {
    branches: branchRows,
    ingredients: ingRows.map((ing) => {
      const reorder = num(ing.reorderLevel);
      const perBranch = branchRows.map((b) => {
        const q = qty.get(`${b.id}:${ing.id}`) ?? 0;
        return { branchId: b.id, quantity: q, level: stockLevel(q, reorder) };
      });
      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        costPerUnit: num(ing.costPerUnit),
        reorderLevel: reorder,
        perBranch,
        total: round3(perBranch.reduce((s, p) => s + p.quantity, 0)),
      };
    }),
  };
}

// ─── Receive / waste / count ─────────────────────────────────────────────────
export async function receiveStock(input: {
  branchId: number;
  staffId: number;
  note?: string;
  lines: Array<{ ingredientId: number; quantity: number; totalCost: number }>;
}) {
  const db = await requireDb();
  await db.transaction(async (tx) => {
    for (const line of input.lines) {
      if (line.quantity <= 0) continue;
      const [ing] = await tx.select().from(ingredients).where(eq(ingredients.id, line.ingredientId)).for("update");
      if (!ing) throw new Error("ไม่พบวัตถุดิบ");
      // ต้นทุนเฉลี่ยคิดจากของที่มีอยู่ทุกสาขา เพราะต้นทุนต่อหน่วยเป็นค่าเดียวทั้งร้าน
      const [{ total } = { total: "0" }] = await tx.select({ total: sql<string>`COALESCE(SUM(${branchStock.quantity}), 0)` })
        .from(branchStock).where(eq(branchStock.ingredientId, line.ingredientId));
      const newCost = movingAverageCost(Math.max(0, num(total)), num(ing.costPerUnit), line.quantity, line.totalCost);
      await tx.update(ingredients).set({ costPerUnit: String(newCost.toFixed(4)) }).where(eq(ingredients.id, ing.id));
      await applyMovements(tx, [{
        branchId: input.branchId,
        ingredientId: line.ingredientId,
        type: "receive",
        quantity: line.quantity,
        unitCost: line.quantity > 0 ? line.totalCost / line.quantity : 0,
        note: input.note,
        staffId: input.staffId,
      }]);
    }
  });
}

export async function recordWaste(input: {
  branchId: number;
  staffId: number;
  note?: string;
  lines: Array<{ ingredientId: number; quantity: number }>;
}) {
  const db = await requireDb();
  await db.transaction(async (tx) => {
    const costs = await costMap(tx, input.lines.map((l) => l.ingredientId));
    await applyMovements(tx, input.lines.filter((l) => l.quantity > 0).map((l) => ({
      branchId: input.branchId,
      ingredientId: l.ingredientId,
      type: "waste" as const,
      quantity: -l.quantity,
      unitCost: costs.get(l.ingredientId) ?? 0,
      note: input.note,
      staffId: input.staffId,
    })));
  });
}

/** นับสต็อกจริง: ปรับยอดในระบบให้ตรงกับที่นับได้ และคืนส่วนต่างให้หน้าจอแสดง */
export async function submitStockCount(input: {
  branchId: number;
  staffId: number;
  note?: string;
  lines: Array<{ ingredientId: number; countedQuantity: number }>;
}) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const costs = await costMap(tx, input.lines.map((l) => l.ingredientId));
    const variances: Array<{ ingredientId: number; before: number; counted: number; diff: number; value: number }> = [];
    for (const line of input.lines) {
      const before = await onHand(tx, input.branchId, line.ingredientId, true);
      const diff = round3(line.countedQuantity - before);
      const unitCost = costs.get(line.ingredientId) ?? 0;
      variances.push({ ingredientId: line.ingredientId, before, counted: line.countedQuantity, diff, value: Math.round(diff * unitCost * 100) / 100 });
      await applyMovements(tx, [{
        branchId: input.branchId,
        ingredientId: line.ingredientId,
        type: "count",
        quantity: diff,
        unitCost,
        note: input.note,
        staffId: input.staffId,
      }]);
    }
    return variances;
  });
}

// ─── Transfers between branches ──────────────────────────────────────────────
export async function createTransfer(input: {
  fromBranchId: number;
  toBranchId: number;
  staffId: number;
  note?: string;
  lines: Array<{ ingredientId: number; quantity: number }>;
}) {
  if (input.fromBranchId === input.toBranchId) throw new Error("สาขาต้นทางและปลายทางต้องไม่ใช่สาขาเดียวกัน");
  const lines = input.lines.filter((l) => l.quantity > 0);
  if (lines.length === 0) throw new Error("กรุณาใส่จำนวนอย่างน้อย 1 รายการ");
  const db = await requireDb();
  const ends = await db.select({ id: branches.id, type: branches.type }).from(branches)
    .where(inArray(branches.id, [input.fromBranchId, input.toBranchId]));
  if (ends.some((b) => b.type === "warehouse")) throw new Error("ของเข้า-ออกคลังกลางใช้เมนู “เบิกจากคลัง” แทน");
  return db.transaction(async (tx) => {
    const costs = await costMap(tx, lines.map((l) => l.ingredientId));
    const [res] = await tx.insert(stockTransfers).values({
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
      note: input.note ?? null,
      createdBy: input.staffId,
    });
    const transferId = (res as { insertId: number }).insertId;
    for (const l of lines) {
      await tx.insert(stockTransferLines).values({
        transferId,
        ingredientId: l.ingredientId,
        quantity: String(l.quantity),
        unitCost: String(costs.get(l.ingredientId) ?? 0),
      });
    }
    // ของออกจากสาขาต้นทางทันทีที่ส่ง และอยู่ "ระหว่างทาง" จนปลายทางกดรับ
    await applyMovements(tx, lines.map((l) => ({
      branchId: input.fromBranchId,
      ingredientId: l.ingredientId,
      type: "transfer_out" as const,
      quantity: -l.quantity,
      unitCost: costs.get(l.ingredientId) ?? 0,
      transferId,
      note: input.note,
      staffId: input.staffId,
    })));
    return transferId;
  });
}

export async function getBranch(branchId: number) {
  const db = await requireDb();
  const [b] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  return b ?? null;
}

export async function listWarehouses() {
  const db = await requireDb();
  return db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(and(eq(branches.type, "warehouse"), eq(branches.isActive, true))).orderBy(branches.id);
}

/**
 * เบิกของจากคลัง (หรือคืนของเข้าคลัง) — คนของสาขาหยิบของเองแล้วบันทึก จึงเสร็จในขั้นเดียว
 * ยอมให้คลังติดลบได้ เพราะของถูกหยิบไปจริงแล้ว: ยอดติดลบแปลว่าลืมบันทึกรับของเข้าคลัง
 */
export async function withdrawStock(input: {
  kind: "withdrawal" | "return";
  branchId: number;
  warehouseId: number;
  staffId: number;
  note?: string;
  lines: Array<{ ingredientId: number; quantity: number }>;
}) {
  const lines = input.lines.filter((l) => l.quantity > 0);
  if (lines.length === 0) throw new Error("กรุณาใส่จำนวนอย่างน้อย 1 รายการ");
  const [shop, warehouse] = await Promise.all([getBranch(input.branchId), getBranch(input.warehouseId)]);
  if (!warehouse || warehouse.type !== "warehouse" || !warehouse.isActive) throw new Error("ไม่พบคลังกลาง");
  if (!shop || shop.type !== "shop") throw new Error("ไม่พบสาขา");
  if (!shop.usesCentralStock) throw new Error(`${shop.name} ตั้งค่าให้สั่งของเอง ไม่ได้เบิกจากคลังกลาง`);
  const isWithdrawal = input.kind === "withdrawal";
  const from = isWithdrawal ? warehouse.id : shop.id;
  const to = isWithdrawal ? shop.id : warehouse.id;
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const costs = await costMap(tx, lines.map((l) => l.ingredientId));
    const now = new Date();
    const [res] = await tx.insert(stockTransfers).values({
      kind: input.kind,
      fromBranchId: from,
      toBranchId: to,
      status: "received",
      note: input.note ?? null,
      createdBy: input.staffId,
      receivedBy: input.staffId,
      receivedAt: now,
    });
    const transferId = (res as { insertId: number }).insertId;
    const movements: MovementInput[] = [];
    for (const l of lines) {
      const unitCost = costs.get(l.ingredientId) ?? 0;
      await tx.insert(stockTransferLines).values({
        transferId, ingredientId: l.ingredientId, quantity: String(l.quantity), receivedQuantity: String(l.quantity), unitCost: String(unitCost),
      });
      const base = { ingredientId: l.ingredientId, unitCost, transferId, note: input.note, staffId: input.staffId };
      movements.push(
        { ...base, branchId: from, type: isWithdrawal ? "withdraw_out" : "return_out", quantity: -l.quantity },
        { ...base, branchId: to, type: isWithdrawal ? "withdraw_in" : "return_in", quantity: l.quantity },
      );
    }
    await applyMovements(tx, movements);
    // แจ้งรายการที่ต้นทางติดลบหลังเบิก ให้หน้าจอเตือน
    const short: Array<{ ingredientId: number; quantity: number }> = [];
    for (const l of lines) {
      const left = await onHand(tx, from, l.ingredientId);
      if (left < 0) short.push({ ingredientId: l.ingredientId, quantity: left });
    }
    return { transferId, short };
  });
}

export async function getTransfer(transferId: number) {
  const db = await requireDb();
  const [t] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, transferId)).limit(1);
  return t ?? null;
}

/** ปลายทางกดรับ: ใส่จำนวนที่ได้รับจริง ส่วนที่ขาดบันทึกเป็นของเสียระหว่างโอน */
export async function receiveTransfer(input: {
  transferId: number;
  staffId: number;
  lines: Array<{ lineId: number; receivedQuantity: number }>;
}) {
  const db = await requireDb();
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(stockTransfers).where(eq(stockTransfers.id, input.transferId)).for("update");
    if (!t) throw new Error("ไม่พบรายการโอน");
    if (t.status !== "in_transit") throw new Error("รายการนี้รับหรือยกเลิกไปแล้ว");
    const lines = await tx.select().from(stockTransferLines).where(eq(stockTransferLines.transferId, t.id));
    const received = new Map(input.lines.map((l) => [l.lineId, l.receivedQuantity]));
    const movements: MovementInput[] = [];
    for (const line of lines) {
      const sent = num(line.quantity);
      const got = Math.max(0, Math.min(sent, received.get(line.id) ?? sent));
      await tx.update(stockTransferLines).set({ receivedQuantity: String(got) }).where(eq(stockTransferLines.id, line.id));
      const base = { branchId: t.toBranchId, ingredientId: line.ingredientId, unitCost: num(line.unitCost), transferId: t.id, staffId: input.staffId };
      movements.push({ ...base, type: "transfer_in", quantity: sent });
      if (got < sent) movements.push({ ...base, type: "waste", quantity: -(sent - got), note: `ของขาดระหว่างโอน #${t.id}` });
    }
    await applyMovements(tx, movements);
    await tx.update(stockTransfers).set({ status: "received", receivedBy: input.staffId, receivedAt: new Date() }).where(eq(stockTransfers.id, t.id));
  });
}

/** ยกเลิกรายการที่ยังไม่ถูกรับ: คืนของให้สาขาต้นทาง */
export async function cancelTransfer(transferId: number, staffId: number) {
  const db = await requireDb();
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(stockTransfers).where(eq(stockTransfers.id, transferId)).for("update");
    if (!t) throw new Error("ไม่พบรายการโอน");
    if (t.status !== "in_transit") throw new Error("รายการนี้รับหรือยกเลิกไปแล้ว");
    const lines = await tx.select().from(stockTransferLines).where(eq(stockTransferLines.transferId, t.id));
    await applyMovements(tx, lines.map((l) => ({
      branchId: t.fromBranchId,
      ingredientId: l.ingredientId,
      type: "transfer_return" as const,
      quantity: num(l.quantity),
      unitCost: num(l.unitCost),
      transferId: t.id,
      note: "ยกเลิกการโอน",
      staffId,
    })));
    await tx.update(stockTransfers).set({ status: "cancelled" }).where(eq(stockTransfers.id, t.id));
  });
}

export async function listTransfers(branchId?: number, limit = 50, kinds?: Array<"transfer" | "withdrawal" | "return">) {
  const db = await requireDb();
  const conds = [];
  if (branchId) conds.push(sql`(${stockTransfers.fromBranchId} = ${branchId} OR ${stockTransfers.toBranchId} = ${branchId})`);
  if (kinds && kinds.length > 0) conds.push(inArray(stockTransfers.kind, kinds));
  const where = conds.length > 0 ? and(...conds) : undefined;
  const rows = await db.select().from(stockTransfers).where(where).orderBy(desc(stockTransfers.createdAt)).limit(limit);
  if (rows.length === 0) return [];
  const lines = await db.select().from(stockTransferLines).where(inArray(stockTransferLines.transferId, rows.map((r) => r.id)));
  return rows.map((r) => ({
    ...r,
    lines: lines.filter((l) => l.transferId === r.id).map((l) => ({
      id: l.id,
      ingredientId: l.ingredientId,
      quantity: num(l.quantity),
      receivedQuantity: l.receivedQuantity == null ? null : num(l.receivedQuantity),
      unitCost: num(l.unitCost),
    })),
  }));
}

// ─── History ─────────────────────────────────────────────────────────────────
export async function listMovements(opts: { branchId?: number; start: Date; end: Date; type?: StockMovementType; ingredientId?: number; limit?: number }) {
  const db = await requireDb();
  const conds = [gte(stockMovements.createdAt, opts.start), lt(stockMovements.createdAt, opts.end)];
  if (opts.branchId) conds.push(eq(stockMovements.branchId, opts.branchId));
  if (opts.type) conds.push(eq(stockMovements.type, opts.type));
  if (opts.ingredientId) conds.push(eq(stockMovements.ingredientId, opts.ingredientId));
  const rows = await db.select().from(stockMovements).where(and(...conds)).orderBy(desc(stockMovements.createdAt)).limit(opts.limit ?? 200);
  return rows.map((r) => ({ ...r, quantity: num(r.quantity), unitCost: num(r.unitCost) }));
}

/** มูลค่าของเสียและส่วนต่างจากการนับในช่วงเวลา (ใช้ในกำไร-ขาดทุน) */
export async function getStockLossValues(opts: { branchId?: number; start: Date; end: Date }) {
  const db = await requireDb();
  const conds = [gte(stockMovements.createdAt, opts.start), lt(stockMovements.createdAt, opts.end), inArray(stockMovements.type, ["waste", "count"])];
  if (opts.branchId) conds.push(eq(stockMovements.branchId, opts.branchId));
  const rows = await db.select({
    branchId: stockMovements.branchId,
    type: stockMovements.type,
    value: sql<string>`SUM(${stockMovements.quantity} * ${stockMovements.unitCost})`,
  }).from(stockMovements).where(and(...conds)).groupBy(stockMovements.branchId, stockMovements.type);
  return rows.map((r) => ({ branchId: r.branchId, type: r.type as "waste" | "count", value: num(r.value) }));
}
