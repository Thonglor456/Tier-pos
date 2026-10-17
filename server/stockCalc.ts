// Pure calculations for stock, cost and accounting — no DB access, unit-tested in stockCalc.test.ts.

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;
export const num = (v: string | number | null | undefined) => (v == null ? 0 : parseFloat(String(v)) || 0);

export type RecipeLineInput = { itemId: number; variantId: number | null; ingredientId: number; quantity: number };
export type ModifierRecipeLineInput = { modifierOptionId: number; ingredientId: number; quantity: number };
export type SoldLine = {
  itemId: number;
  variantId: number;
  quantity: number;
  modifierOptionIds: number[];
  /** items.costPrice — used when the menu has no recipe yet */
  fallbackUnitCost: number;
};

export type Consumption = {
  /** ingredientId → quantity used (positive = taken out of stock) */
  usage: Map<number, number>;
  /** ต้นทุนของทั้งบิล */
  cost: number;
};

/**
 * สูตรของเมนูหนึ่งขนาด: ถ้าขนาดนั้นมีสูตรของตัวเองใช้สูตรนั้น ไม่งั้นใช้สูตรกลาง (variantId = null)
 */
export function recipeFor(itemId: number, variantId: number, recipes: RecipeLineInput[]): RecipeLineInput[] {
  const forItem = recipes.filter((r) => r.itemId === itemId);
  const specific = forItem.filter((r) => r.variantId === variantId);
  return specific.length > 0 ? specific : forItem.filter((r) => r.variantId == null);
}

export function computeConsumption(
  lines: SoldLine[],
  recipes: RecipeLineInput[],
  modifierRecipes: ModifierRecipeLineInput[],
  costPerUnit: Map<number, number>,
): Consumption {
  const usage = new Map<number, number>();
  let cost = 0;
  const add = (ingredientId: number, qty: number) => {
    usage.set(ingredientId, round3((usage.get(ingredientId) ?? 0) + qty));
  };

  for (const line of lines) {
    const base = recipeFor(line.itemId, line.variantId, recipes);
    if (base.length === 0) {
      cost += line.fallbackUnitCost * line.quantity;
    } else {
      for (const r of base) add(r.ingredientId, r.quantity * line.quantity);
    }
    for (const optionId of line.modifierOptionIds) {
      for (const m of modifierRecipes) {
        if (m.modifierOptionId === optionId) add(m.ingredientId, m.quantity * line.quantity);
      }
    }
  }
  // ตัวเลือกที่ "แทน" วัตถุดิบ (ค่าติดลบ) ไม่ควรทำให้ใช้ของติดลบ
  for (const [id, qty] of Array.from(usage.entries())) {
    if (qty <= 0) usage.delete(id);
    else cost += qty * (costPerUnit.get(id) ?? 0);
  }
  return { usage, cost: round2(cost) };
}

/** ต้นทุนเฉลี่ยใหม่หลังรับของเข้า (moving average) */
export function movingAverageCost(onHand: number, currentCost: number, addQty: number, addTotalCost: number): number {
  if (addQty <= 0) return currentCost;
  if (onHand <= 0) return addTotalCost / addQty;
  return (onHand * currentCost + addTotalCost) / (onHand + addQty);
}

export type StockLevel = "out" | "low" | "ok";
export function stockLevel(quantity: number, reorderLevel: number): StockLevel {
  if (quantity <= 0) return "out";
  if (reorderLevel > 0 && quantity <= reorderLevel) return "low";
  return "ok";
}

// ─── Reconciliation ──────────────────────────────────────────────────────────
export const TRANSFER_SOURCE = "transfer";
export const WALKIN_SLUG = "walkin";

export type ReconOrder = { salesChannel: string; paymentMethod: string; totalAmount: number };

/**
 * ยอดที่ควรได้รับของแต่ละแหล่งเงินในหนึ่งวัน:
 * - "transfer": บิลหน้าร้านที่จ่ายด้วยการโอน (เงินเข้าบัญชีร้านตรง)
 * - ช่องทางเดลิเวอรี: ยอดขายทั้งหมดของช่องทางนั้น แอปจ่ายให้หลังหัก GP
 */
export function reconciliationSources(
  orders: ReconOrder[],
  channels: Array<{ slug: string; name: string; gpPercent: number }>,
) {
  const transferGross = orders
    .filter((o) => o.salesChannel === WALKIN_SLUG && o.paymentMethod === "transfer")
    .reduce((s, o) => s + o.totalAmount, 0);
  const result = [{ source: TRANSFER_SOURCE, label: "โอนเข้าบัญชีร้าน", gross: round2(transferGross), gpPercent: 0, expectedNet: round2(transferGross) }];
  for (const ch of channels) {
    if (ch.slug === WALKIN_SLUG) continue;
    const gross = orders.filter((o) => o.salesChannel === ch.slug).reduce((s, o) => s + o.totalAmount, 0);
    result.push({ source: ch.slug, label: ch.name, gross: round2(gross), gpPercent: ch.gpPercent, expectedNet: expectedNet(gross, ch.gpPercent) });
  }
  return result;
}

export function expectedNet(gross: number, gpPercent: number) {
  return round2(gross * (1 - gpPercent / 100));
}

export type ReconStatus = "matched" | "short" | "over";
/** ต่างกันไม่เกิน 1 บาทถือว่าตรง (เศษสตางค์จากการปัดของแอป) */
export function reconStatus(expected: number, actual: number, tolerance = 1): ReconStatus {
  const diff = round2(actual - expected);
  if (Math.abs(diff) <= tolerance) return "matched";
  return diff < 0 ? "short" : "over";
}

// ─── Profit & Loss ───────────────────────────────────────────────────────────
export type PnlInput = {
  orders: Array<{ branchId: number | null; salesChannel: string; totalAmount: number; vatAmount: number; costAmount: number | null; businessDate: string }>;
  /** cost for orders whose costAmount is null (sold before stock tracking) */
  fallbackCostByOrder?: number[];
  channels: Array<{ slug: string; name: string; gpPercent: number }>;
  /** fees actually deducted, keyed by feeKey(branchId, businessDate, channel) from saved reconciliations */
  actualFees: Map<string, number>;
  /** reconciliation shortfalls/overages (actual − expected), summed */
  reconDiff: number;
  wasteValue: number;
  /** stock count variance value (negative = missing stock) */
  countVarianceValue: number;
};

export const feeKey = (branchId: number | null, businessDate: string, channel: string) => `${branchId ?? ""}|${businessDate}|${channel}`;

export function buildPnl(input: PnlInput) {
  const gpByChannel = new Map(input.channels.map((c) => [c.slug, c.gpPercent]));
  const nameByChannel = new Map(input.channels.map((c) => [c.slug, c.name]));

  const grossByChannel = new Map<string, number>();
  let gross = 0;
  let vat = 0;
  let cogs = 0;
  let uncostedOrders = 0;
  // GP แยกตามวัน+ช่องทาง เพื่อใช้ GP จริงของวันที่กระทบยอดแล้ว และประมาณการวันที่ยังไม่ได้กระทบ
  const grossByDayChannel = new Map<string, number>();

  input.orders.forEach((o, i) => {
    gross += o.totalAmount;
    vat += o.vatAmount;
    grossByChannel.set(o.salesChannel, (grossByChannel.get(o.salesChannel) ?? 0) + o.totalAmount);
    if (o.costAmount != null) cogs += o.costAmount;
    else {
      cogs += input.fallbackCostByOrder?.[i] ?? 0;
      uncostedOrders += 1;
    }
    if (o.salesChannel !== WALKIN_SLUG) {
      const key = feeKey(o.branchId, o.businessDate, o.salesChannel);
      grossByDayChannel.set(key, (grossByDayChannel.get(key) ?? 0) + o.totalAmount);
    }
  });

  let gpActual = 0;
  let gpEstimated = 0;
  for (const [key, dayGross] of Array.from(grossByDayChannel.entries())) {
    const actual = input.actualFees.get(key);
    if (actual != null) gpActual += actual;
    else gpEstimated += dayGross * ((gpByChannel.get(key.split("|")[2]!) ?? 0) / 100);
  }

  const netSales = gross - vat - gpActual - gpEstimated;
  const grossProfit = netSales - cogs;
  // ของเสียเป็นค่าใช้จ่าย; นับสต็อกแล้วขาด (ติดลบ) เป็นค่าใช้จ่าย, เกิน (บวก) ลดค่าใช้จ่าย
  const stockLoss = input.wasteValue - input.countVarianceValue;
  const profit = grossProfit - stockLoss + input.reconDiff;

  return {
    gross: round2(gross),
    byChannel: Array.from(grossByChannel.entries())
      .map(([slug, amount]) => ({ slug, name: nameByChannel.get(slug) ?? slug, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    vat: round2(vat),
    gpActual: round2(gpActual),
    gpEstimated: round2(gpEstimated),
    netSales: round2(netSales),
    cogs: round2(cogs),
    uncostedOrders,
    grossProfit: round2(grossProfit),
    grossMargin: netSales > 0 ? round2((grossProfit / netSales) * 100) : 0,
    wasteValue: round2(input.wasteValue),
    countVarianceValue: round2(input.countVarianceValue),
    reconDiff: round2(input.reconDiff),
    profit: round2(profit),
  };
}

/** YYYY-MM-DD in Thailand time — the POS runs in one timezone, and a "day" closes at local midnight. */
export function businessDateOf(d: Date, tzOffsetMinutes = 7 * 60): string {
  return new Date(d.getTime() + tzOffsetMinutes * 60000).toISOString().slice(0, 10);
}

/** [start, end) instants for a Thailand business date range (inclusive dates). */
export function businessDateRange(from: string, to: string, tzOffsetMinutes = 7 * 60) {
  const start = new Date(`${from}T00:00:00.000Z`).getTime() - tzOffsetMinutes * 60000;
  const end = new Date(`${to}T00:00:00.000Z`).getTime() + 86400000 - tzOffsetMinutes * 60000;
  return { start: new Date(start), end: new Date(end) };
}
