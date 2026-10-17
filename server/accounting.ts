import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { branches, items, orderItems, orders, reconciliations, salesChannels } from "../drizzle/schema";
import { getDb } from "./db";
import { getStockLossValues } from "./stock";
import {
  TRANSFER_SOURCE,
  buildPnl,
  businessDateOf,
  feeKey,
  businessDateRange,
  num,
  reconStatus,
  reconciliationSources,
  round2,
} from "./stockCalc";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db;
}

async function getChannels() {
  const db = await requireDb();
  const rows = await db.select().from(salesChannels).orderBy(salesChannels.sortOrder);
  return rows.map((c) => ({ slug: c.slug, name: c.name, gpPercent: num(c.gpPercent) }));
}

async function completedOrders(opts: { branchId?: number; start: Date; end: Date }) {
  const db = await requireDb();
  const conds = [eq(orders.status, "completed"), gte(orders.createdAt, opts.start), lt(orders.createdAt, opts.end)];
  if (opts.branchId) conds.push(eq(orders.branchId, opts.branchId));
  return db.select({
    id: orders.id,
    branchId: orders.branchId,
    salesChannel: orders.salesChannel,
    paymentMethod: orders.paymentMethod,
    totalAmount: orders.totalAmount,
    vatAmount: orders.vatAmount,
    costAmount: orders.costAmount,
    createdAt: orders.createdAt,
  }).from(orders).where(and(...conds));
}

// ─── Reconciliation ──────────────────────────────────────────────────────────
/** ยอดที่ระบบคาดว่าจะได้รับในวันนั้น เทียบกับยอดที่กรอกไว้แล้ว */
export async function getReconciliationDay(branchId: number, businessDate: string) {
  const db = await requireDb();
  const { start, end } = businessDateRange(businessDate, businessDate);
  const [orderRows, channels, saved] = await Promise.all([
    completedOrders({ branchId, start, end }),
    getChannels(),
    db.select().from(reconciliations).where(and(eq(reconciliations.branchId, branchId), eq(reconciliations.businessDate, businessDate))),
  ]);
  const sources = reconciliationSources(
    orderRows.map((o) => ({ salesChannel: o.salesChannel, paymentMethod: o.paymentMethod, totalAmount: num(o.totalAmount) })),
    channels,
  );
  return sources.map((s) => {
    const row = saved.find((r) => r.source === s.source);
    const suggestedFee = round2(s.gross - s.expectedNet);
    if (!row) return { ...s, suggestedFee, saved: null };
    const fee = num(row.feeAmount);
    const actual = num(row.actualNet);
    // เทียบยอดที่ได้รับกับยอดขายของ "ตอนนี้" — ถ้ามีบิลยกเลิกหลังกระทบยอด จะเห็นว่าไม่ตรงอีกครั้ง
    const expected = round2(s.gross - fee);
    return {
      ...s,
      suggestedFee,
      saved: {
        actualNet: actual,
        feeAmount: fee,
        note: row.note,
        diff: round2(actual - expected),
        status: reconStatus(expected, actual),
        grossAtSave: num(row.grossAmount),
        updatedAt: row.updatedAt,
      },
    };
  });
}

export async function saveReconciliation(input: {
  branchId: number;
  businessDate: string;
  source: string;
  actualNet: number;
  feeAmount?: number;
  note?: string;
  staffId: number;
}) {
  const db = await requireDb();
  const day = await getReconciliationDay(input.branchId, input.businessDate);
  const src = day.find((d) => d.source === input.source);
  if (!src) throw new Error("ไม่พบช่องทางนี้");
  const fee = input.source === TRANSFER_SOURCE ? 0 : input.feeAmount ?? src.suggestedFee;
  const values = {
    grossAmount: String(src.gross),
    expectedNet: String(round2(src.gross - fee)),
    actualNet: String(input.actualNet),
    feeAmount: String(fee),
    note: input.note ?? null,
    staffId: input.staffId,
  };
  await db.insert(reconciliations)
    .values({ branchId: input.branchId, businessDate: input.businessDate, source: input.source, ...values })
    .onDuplicateKeyUpdate({ set: values });
  return { diff: round2(input.actualNet - (src.gross - fee)), status: reconStatus(src.gross - fee, input.actualNet) };
}

/** สถานะกระทบยอดรายวันในช่วงเวลา: วันไหนยังไม่กระทบ วันไหนเงินไม่ตรง */
export async function getReconciliationCalendar(branchId: number, from: string, to: string) {
  const db = await requireDb();
  const { start, end } = businessDateRange(from, to);
  const [orderRows, channels, saved] = await Promise.all([
    completedOrders({ branchId, start, end }),
    getChannels(),
    db.select().from(reconciliations).where(and(
      eq(reconciliations.branchId, branchId),
      gte(reconciliations.businessDate, from),
      sql`${reconciliations.businessDate} <= ${to}`,
    )),
  ]);
  const byDay = new Map<string, typeof orderRows>();
  for (const o of orderRows) {
    const d = businessDateOf(new Date(o.createdAt));
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(o);
  }
  const days: Array<{ date: string; pending: number; mismatched: number; matched: number; diff: number }> = [];
  for (const [date, rows] of Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    const sources = reconciliationSources(
      rows.map((o) => ({ salesChannel: o.salesChannel, paymentMethod: o.paymentMethod, totalAmount: num(o.totalAmount) })),
      channels,
    ).filter((s) => s.gross > 0);
    let pending = 0, mismatched = 0, matched = 0, diff = 0;
    for (const s of sources) {
      const row = saved.find((r) => r.businessDate === date && r.source === s.source);
      if (!row) { pending += 1; continue; }
      const expected = s.gross - num(row.feeAmount);
      const d = round2(num(row.actualNet) - expected);
      diff += d;
      if (reconStatus(expected, num(row.actualNet)) === "matched") matched += 1;
      else mismatched += 1;
    }
    days.push({ date, pending, mismatched, matched, diff: round2(diff) });
  }
  return days;
}

// ─── Profit & Loss ───────────────────────────────────────────────────────────
export async function getProfitAndLoss(opts: { branchId?: number; from: string; to: string }) {
  const db = await requireDb();
  const { start, end } = businessDateRange(opts.from, opts.to);
  const reconConds = [gte(reconciliations.businessDate, opts.from), sql`${reconciliations.businessDate} <= ${opts.to}`];
  if (opts.branchId) reconConds.push(eq(reconciliations.branchId, opts.branchId));
  const [orderRows, channels, reconRows, lossRows, branchRows] = await Promise.all([
    completedOrders({ branchId: opts.branchId, start, end }),
    getChannels(),
    db.select().from(reconciliations).where(and(...reconConds)),
    getStockLossValues({ branchId: opts.branchId, start, end }),
    db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(branches.id),
  ]);

  // บิลก่อนมีระบบสต็อกไม่มี costAmount: ใช้ต้นทุนต่อเมนู (items.costPrice) แทน
  const uncostedIds = orderRows.filter((o) => o.costAmount == null).map((o) => o.id);
  const fallbackCost = new Map<number, number>();
  for (let i = 0; i < uncostedIds.length; i += 1000) {
    const chunk = uncostedIds.slice(i, i + 1000);
    const rows = await db.select({
      orderId: orderItems.orderId,
      cost: sql<string>`SUM(${orderItems.quantity} * COALESCE(${items.costPrice}, 0))`,
    }).from(orderItems).leftJoin(items, eq(orderItems.itemId, items.id))
      .where(inArray(orderItems.orderId, chunk)).groupBy(orderItems.orderId);
    for (const r of rows) fallbackCost.set(r.orderId, num(r.cost));
  }

  const pnlFor = (branchId: number | null | undefined) => {
    const os = orderRows.filter((o) => branchId === undefined || o.branchId === branchId);
    const recon = reconRows.filter((r) => branchId === undefined || r.branchId === branchId);
    const losses = lossRows.filter((l) => branchId === undefined || l.branchId === branchId);
    const actualFees = new Map<string, number>();
    let reconDiff = 0;
    // ส่วนต่างกระทบยอดคิดจากยอดขายปัจจุบันของวันนั้น (ตรงกับหน้ากระทบยอด)
    const grossKey = new Map<string, number>();
    for (const o of os) {
      const d = businessDateOf(new Date(o.createdAt));
      const amount = num(o.totalAmount);
      const src = o.salesChannel === "walkin" ? (o.paymentMethod === "transfer" ? TRANSFER_SOURCE : null) : o.salesChannel;
      if (!src) continue;
      const key = `${o.branchId}|${d}|${src}`;
      grossKey.set(key, (grossKey.get(key) ?? 0) + amount);
    }
    for (const r of recon) {
      const fee = num(r.feeAmount);
      if (r.source !== TRANSFER_SOURCE) actualFees.set(feeKey(r.branchId, r.businessDate, r.source), fee);
      const gross = grossKey.get(`${r.branchId}|${r.businessDate}|${r.source}`) ?? 0;
      reconDiff += num(r.actualNet) - (gross - fee);
    }
    return buildPnl({
      orders: os.map((o) => ({
        branchId: o.branchId,
        salesChannel: o.salesChannel,
        totalAmount: num(o.totalAmount),
        vatAmount: num(o.vatAmount),
        costAmount: o.costAmount == null ? null : num(o.costAmount),
        businessDate: businessDateOf(new Date(o.createdAt)),
      })),
      fallbackCostByOrder: os.map((o) => fallbackCost.get(o.id) ?? 0),
      channels,
      actualFees,
      reconDiff,
      wasteValue: -losses.filter((l) => l.type === "waste").reduce((s, l) => s + l.value, 0),
      countVarianceValue: losses.filter((l) => l.type === "count").reduce((s, l) => s + l.value, 0),
    });
  };

  // คลังกลางไม่มียอดขาย แต่ของเสีย/ส่วนต่างการนับของคลังต้องโผล่เป็นคอลัมน์ของตัวเอง
  const branchIds = opts.branchId ? [opts.branchId] : Array.from(new Set<number | null>([...orderRows.map((o) => o.branchId), ...lossRows.map((l) => l.branchId)]));
  return {
    from: opts.from,
    to: opts.to,
    total: pnlFor(opts.branchId ?? undefined),
    branches: opts.branchId ? [] : branchIds.map((id) => ({
      branchId: id,
      name: id == null ? "ไม่ระบุสาขา" : branchRows.find((b) => b.id === id)?.name ?? `สาขา #${id}`,
      pnl: pnlFor(id),
    })),
  };
}

