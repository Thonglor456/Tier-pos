import { describe, expect, it } from "vitest";
import {
  buildPnl,
  businessDateOf,
  businessDateRange,
  computeConsumption,
  expectedNet,
  feeKey,
  movingAverageCost,
  recipeFor,
  reconStatus,
  reconciliationSources,
  stockLevel,
} from "./stockCalc";

// เมล็ด=1 (0.6฿/g), นมสด=2 (0.05฿/ml), แก้ว=3 (2฿/ใบ), นมโอ๊ต=4 (0.12฿/ml)
const costs = new Map([[1, 0.6], [2, 0.05], [3, 2], [4, 0.12]]);
const recipes = [
  { itemId: 10, variantId: null, ingredientId: 1, quantity: 18 },
  { itemId: 10, variantId: null, ingredientId: 2, quantity: 150 },
  { itemId: 10, variantId: null, ingredientId: 3, quantity: 1 },
  // ขนาดใหญ่ (variant 102) มีสูตรของตัวเอง
  { itemId: 10, variantId: 102, ingredientId: 1, quantity: 27 },
  { itemId: 10, variantId: 102, ingredientId: 2, quantity: 220 },
  { itemId: 10, variantId: 102, ingredientId: 3, quantity: 1 },
];
const modRecipes = [
  { modifierOptionId: 500, ingredientId: 1, quantity: 18 }, // เพิ่มช็อต
  { modifierOptionId: 600, ingredientId: 2, quantity: -150 }, // นมโอ๊ตแทนนมสด
  { modifierOptionId: 600, ingredientId: 4, quantity: 150 },
];

describe("recipeFor", () => {
  it("uses the size-specific recipe when one exists, otherwise the shared one", () => {
    expect(recipeFor(10, 102, recipes).map((r) => r.quantity)).toEqual([27, 220, 1]);
    expect(recipeFor(10, 101, recipes).map((r) => r.quantity)).toEqual([18, 150, 1]);
  });
});

describe("computeConsumption", () => {
  it("multiplies the recipe by quantity and prices it", () => {
    const { usage, cost } = computeConsumption(
      [{ itemId: 10, variantId: 101, quantity: 2, modifierOptionIds: [], fallbackUnitCost: 0 }],
      recipes, modRecipes, costs,
    );
    expect(usage.get(1)).toBe(36);
    expect(usage.get(2)).toBe(300);
    expect(usage.get(3)).toBe(2);
    expect(cost).toBe(40.6); // 2 × (18×0.6 + 150×0.05 + 2)
  });

  it("adds extra-shot modifiers and swaps milk for oat milk", () => {
    const { usage, cost } = computeConsumption(
      [{ itemId: 10, variantId: 101, quantity: 1, modifierOptionIds: [500, 600], fallbackUnitCost: 0 }],
      recipes, modRecipes, costs,
    );
    expect(usage.get(1)).toBe(36);
    expect(usage.has(2)).toBe(false); // นมสดถูกแทนหมด
    expect(usage.get(4)).toBe(150);
    expect(cost).toBe(41.6); // 36×0.6 + 150×0.12 + 2
  });

  it("falls back to the menu's cost price when there is no recipe", () => {
    const { usage, cost } = computeConsumption(
      [{ itemId: 99, variantId: 1, quantity: 3, modifierOptionIds: [], fallbackUnitCost: 12.5 }],
      recipes, modRecipes, costs,
    );
    expect(usage.size).toBe(0);
    expect(cost).toBe(37.5);
  });

  it("never prices a negative substitution on a menu that lacks the replaced ingredient", () => {
    const { cost } = computeConsumption(
      [{ itemId: 99, variantId: 1, quantity: 1, modifierOptionIds: [600], fallbackUnitCost: 10 }],
      recipes, modRecipes, costs,
    );
    expect(cost).toBe(10 + 150 * 0.12);
  });
});

describe("movingAverageCost", () => {
  it("blends existing stock with the new purchase", () => {
    // มี 1,000 g ที่ 0.6 รับเพิ่ม 1,000 g ราคา 800 → 0.7
    expect(movingAverageCost(1000, 0.6, 1000, 800)).toBeCloseTo(0.7);
  });
  it("uses the purchase price when stock is empty or negative", () => {
    expect(movingAverageCost(0, 0.6, 500, 400)).toBe(0.8);
    expect(movingAverageCost(-20, 0.6, 500, 400)).toBe(0.8);
  });
});

describe("stockLevel", () => {
  it("flags out and low stock", () => {
    expect(stockLevel(0, 100)).toBe("out");
    expect(stockLevel(80, 100)).toBe("low");
    expect(stockLevel(500, 100)).toBe("ok");
    expect(stockLevel(5, 0)).toBe("ok");
  });
});

describe("reconciliation", () => {
  const channels = [
    { slug: "walkin", name: "หน้าร้าน", gpPercent: 0 },
    { slug: "grab", name: "Grab", gpPercent: 30 },
    { slug: "lineman", name: "LINE MAN", gpPercent: 32 },
  ];
  const orders = [
    { salesChannel: "walkin", paymentMethod: "transfer", totalAmount: 120 },
    { salesChannel: "walkin", paymentMethod: "cash", totalAmount: 80 },
    { salesChannel: "grab", paymentMethod: "transfer", totalAmount: 200 },
    { salesChannel: "lineman", paymentMethod: "cash", totalAmount: 100 },
  ];

  it("expects walk-in transfers in the bank and delivery sales net of GP", () => {
    const s = reconciliationSources(orders, channels);
    expect(s.find((x) => x.source === "transfer")).toMatchObject({ gross: 120, expectedNet: 120 });
    // Grab บิลที่ลูกค้าจ่ายผ่านแอป ไม่ถูกนับซ้ำเป็นเงินโอนเข้าบัญชีร้าน
    expect(s.find((x) => x.source === "grab")).toMatchObject({ gross: 200, expectedNet: 140 });
    expect(s.find((x) => x.source === "lineman")).toMatchObject({ gross: 100, expectedNet: 68 });
    expect(s.some((x) => x.source === "walkin")).toBe(false);
  });

  it("treats differences within 1 baht as matched", () => {
    expect(expectedNet(333.33, 30)).toBe(233.33);
    expect(reconStatus(140, 139.5)).toBe("matched");
    expect(reconStatus(140, 120)).toBe("short");
    expect(reconStatus(140, 150)).toBe("over");
  });
});

describe("buildPnl", () => {
  const channels = [
    { slug: "walkin", name: "หน้าร้าน", gpPercent: 0 },
    { slug: "grab", name: "Grab", gpPercent: 30 },
  ];

  it("uses actual GP where reconciled and estimates the rest, per branch", () => {
    const pnl = buildPnl({
      orders: [
        { branchId: 1, salesChannel: "walkin", totalAmount: 1000, vatAmount: 0, costAmount: 300, businessDate: "2026-10-01" },
        { branchId: 1, salesChannel: "grab", totalAmount: 500, vatAmount: 0, costAmount: 150, businessDate: "2026-10-01" },
        { branchId: 2, salesChannel: "grab", totalAmount: 400, vatAmount: 0, costAmount: 120, businessDate: "2026-10-01" },
      ],
      channels,
      // สาขา 1 กระทบยอดแล้ว (GP จริง 160) สาขา 2 ยังไม่กระทบ → ประมาณ 30% ของ 400
      actualFees: new Map([[feeKey(1, "2026-10-01", "grab"), 160]]),
      reconDiff: -20,
      wasteValue: 50,
      countVarianceValue: -30,
    });
    expect(pnl.gross).toBe(1900);
    expect(pnl.gpActual).toBe(160);
    expect(pnl.gpEstimated).toBe(120);
    expect(pnl.netSales).toBe(1620);
    expect(pnl.cogs).toBe(570);
    expect(pnl.grossProfit).toBe(1050);
    // 1050 − ของเสีย 50 − ของขาดจากการนับ 30 − เงินขาด 20
    expect(pnl.profit).toBe(950);
  });

  it("costs old orders with the fallback and counts them", () => {
    const pnl = buildPnl({
      orders: [{ branchId: 1, salesChannel: "walkin", totalAmount: 100, vatAmount: 6.54, costAmount: null, businessDate: "2026-09-01" }],
      fallbackCostByOrder: [30],
      channels,
      actualFees: new Map(),
      reconDiff: 0,
      wasteValue: 0,
      countVarianceValue: 0,
    });
    expect(pnl.cogs).toBe(30);
    expect(pnl.uncostedOrders).toBe(1);
    expect(pnl.netSales).toBe(93.46);
  });
});

describe("Thai business dates", () => {
  it("closes the day at midnight Bangkok time", () => {
    expect(businessDateOf(new Date("2026-10-10T16:59:00Z"))).toBe("2026-10-10");
    expect(businessDateOf(new Date("2026-10-10T17:00:00Z"))).toBe("2026-10-11");
  });
  it("turns inclusive dates into a [start, end) range", () => {
    const { start, end } = businessDateRange("2026-10-01", "2026-10-02");
    expect(start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-02T17:00:00.000Z");
  });
});
