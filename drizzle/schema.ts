import {
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { time } from "drizzle-orm/mysql-core";

// ─── Auth Users (Manus OAuth) ────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── POS Staff Users (PIN-based) ─────────────────────────────────────────────
export const posUsers = mysqlTable("pos_users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  pinCode: varchar("pinCode", { length: 6 }).notNull(),
  role: mysqlEnum("role", ["staff", "manager", "admin"]).default("staff").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  branchId: int("branchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PosUser = typeof posUsers.$inferSelect;

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Category = typeof categories.$inferSelect;

// ─── Items ────────────────────────────────────────────────────────────────────
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 50 }).unique(),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  hasVariants: boolean("hasVariants").default(false).notNull(),
  cupsPerServing: int("cupsPerServing").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Item = typeof items.$inferSelect;

// ─── Item Variants (ร้อน/เย็น/etc.) ─────────────────────────────────────────
export const itemVariants = mysqlTable("item_variants", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  priceWalkin: decimal("priceWalkin", { precision: 10, scale: 2 }).notNull(),
  priceGrab: decimal("priceGrab", { precision: 10, scale: 2 }).notNull(),
  priceLineman: decimal("priceLineman", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ItemVariant = typeof itemVariants.$inferSelect;

// ─── Modifier Groups ──────────────────────────────────────────────────────────
export const modifierGroups = mysqlTable("modifier_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  isRequired: boolean("isRequired").default(false).notNull(),
  minSelect: int("minSelect").default(0).notNull(),
  maxSelect: int("maxSelect").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ModifierGroup = typeof modifierGroups.$inferSelect;

// ─── Modifier Options ─────────────────────────────────────────────────────────
export const modifierOptions = mysqlTable("modifier_options", {
  id: int("id").autoincrement().primaryKey(),
  modifierGroupId: int("modifierGroupId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  priceAdd: decimal("priceAdd", { precision: 10, scale: 2 }).default("0").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ModifierOption = typeof modifierOptions.$inferSelect;

// ─── Item ↔ Modifier Group Mapping ───────────────────────────────────────────
export const itemModifierGroups = mysqlTable(
  "item_modifier_groups",
  {
    itemId: int("itemId").notNull(),
    modifierGroupId: int("modifierGroupId").notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.modifierGroupId] })]
);

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 30 }).notNull().unique(),
  salesChannel: varchar("salesChannel", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["completed", "cancelled"]).default("completed").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "transfer", "thai_chuay_thai"]).notNull(),
  cashReceived: decimal("cashReceived", { precision: 10, scale: 2 }),
  changeAmount: decimal("changeAmount", { precision: 10, scale: 2 }),
  vatAmount: decimal("vatAmount", { precision: 10, scale: 2 }).default("0"),
  staffId: int("staffId"),
  branchId: int("branchId"),
  cancelledBy: varchar("cancelledBy", { length: 100 }),
  cancelReason: text("cancelReason"),
  cancelledAt: timestamp("cancelledAt"),
  // ต้นทุนวัตถุดิบของบิล ณ เวลาขาย (ใช้ทำกำไร-ขาดทุน) — บิลเก่าก่อนมีระบบสต็อกเป็น null
  costAmount: decimal("costAmount", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Order = typeof orders.$inferSelect;

// ─── Order Items ──────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  itemId: int("itemId").notNull(),
  variantId: int("variantId").notNull(),
  itemName: varchar("itemName", { length: 200 }).notNull(),
  variantName: varchar("variantName", { length: 100 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  modifiersPrice: decimal("modifiersPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrderItem = typeof orderItems.$inferSelect;

// ─── Order Item Modifiers ─────────────────────────────────────────────────────
export const orderItemModifiers = mysqlTable("order_item_modifiers", {
  id: int("id").autoincrement().primaryKey(),
  orderItemId: int("orderItemId").notNull(),
  modifierOptionId: int("modifierOptionId").notNull(),
  modifierGroupName: varchar("modifierGroupName", { length: 100 }).notNull(),
  modifierName: varchar("modifierName", { length: 100 }).notNull(),
  priceAdd: decimal("priceAdd", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrderItemModifier = typeof orderItemModifiers.$inferSelect;

// ─── Store Settings ───────────────────────────────────────────────────────────
export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  shopName: varchar("shopName", { length: 200 }).default("Tier Coffee").notNull(),
  logoUrl: text("logoUrl"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  taxId: varchar("taxId", { length: 20 }),
  vatEnabled: boolean("vatEnabled").default(false).notNull(),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("7.00").notNull(),
  openTime: varchar("openTime", { length: 5 }).default("07:00"),
  closeTime: varchar("closeTime", { length: 5 }).default("20:00"),
  promptpayQrUrl: text("promptpayQrUrl"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StoreSettings = typeof storeSettings.$inferSelect;

// ─── Sales Channels ───────────────────────────────────────────────────────────
export const salesChannels = mysqlTable("sales_channels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  // ค่า GP ที่แอปเดลิเวอรีหัก (%) — หน้าร้านเป็น 0
  gpPercent: decimal("gpPercent", { precision: 5, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SalesChannel = typeof salesChannels.$inferSelect;

export const BRANCH_TYPES = ["shop", "warehouse"] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  // shop = ร้านที่ขาย, warehouse = คลังกลาง (ไม่มีหน้าขาย สาขามาเบิกของไป)
  type: mysqlEnum("type", BRANCH_TYPES).default("shop").notNull(),
  // สาขาที่เบิกของจากคลังกลาง (ร้านที่สั่งของเองทั้งหมดปิดไว้)
  usesCentralStock: boolean("usesCentralStock").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ─── Stock: Ingredients ───────────────────────────────────────────────────────
export const ingredients = mysqlTable("ingredients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(), // g, ml, ชิ้น
  // ต้นทุนเฉลี่ยต่อหน่วย (moving average จากการรับของเข้า)
  costPerUnit: decimal("costPerUnit", { precision: 12, scale: 4 }).default("0").notNull(),
  // แจ้งเตือนเมื่อคงเหลือในสาขาต่ำกว่าค่านี้
  reorderLevel: decimal("reorderLevel", { precision: 14, scale: 3 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Ingredient = typeof ingredients.$inferSelect;

// ─── Stock: Recipes (สูตรต่อเมนู) ──────────────────────────────────────────────
// variantId = null ใช้กับทุกขนาด; ถ้าขนาดไหนมีสูตรของตัวเอง จะใช้สูตรของขนาดนั้นแทน
export const recipeLines = mysqlTable("recipe_lines", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  variantId: int("variantId"),
  ingredientId: int("ingredientId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
}, (t) => [index("recipe_lines_item_idx").on(t.itemId)]);
export type RecipeLine = typeof recipeLines.$inferSelect;

// ตัวเลือกที่ใช้วัตถุดิบเพิ่ม/แทน เช่น เพิ่มช็อต (+18g), นมโอ๊ต (นมวัว −150, นมโอ๊ต +150)
export const modifierRecipeLines = mysqlTable("modifier_recipe_lines", {
  id: int("id").autoincrement().primaryKey(),
  modifierOptionId: int("modifierOptionId").notNull(),
  ingredientId: int("ingredientId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(), // ติดลบได้
}, (t) => [index("modifier_recipe_lines_option_idx").on(t.modifierOptionId)]);
export type ModifierRecipeLine = typeof modifierRecipeLines.$inferSelect;

// ─── Stock: คงเหลือรายสาขา ───────────────────────────────────────────────────
export const branchStock = mysqlTable("branch_stock", {
  branchId: int("branchId").notNull(),
  ingredientId: int("ingredientId").notNull(),
  quantity: decimal("quantity", { precision: 14, scale: 3 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [primaryKey({ columns: [t.branchId, t.ingredientId] })]);
export type BranchStock = typeof branchStock.$inferSelect;

// ─── Stock: ความเคลื่อนไหวทุกครั้ง (append-only) ──────────────────────────────
export const STOCK_MOVEMENT_TYPES = [
  "sale", "sale_cancel", "receive", "count", "waste", "transfer_out", "transfer_in", "transfer_return",
  "withdraw_out", "withdraw_in", "return_out", "return_in",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  ingredientId: int("ingredientId").notNull(),
  type: mysqlEnum("type", STOCK_MOVEMENT_TYPES).notNull(),
  quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(), // + เข้า / − ออก
  unitCost: decimal("unitCost", { precision: 12, scale: 4 }).default("0").notNull(),
  orderId: int("orderId"),
  transferId: int("transferId"),
  note: text("note"),
  staffId: int("staffId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("stock_movements_branch_time_idx").on(t.branchId, t.createdAt),
  index("stock_movements_order_idx").on(t.orderId),
]);
export type StockMovement = typeof stockMovements.$inferSelect;

// ─── Stock: โอนของระหว่างสาขา ─────────────────────────────────────────────────
// transfer = ร้านส่งให้ร้าน (ปลายทางกดรับ), withdrawal = สาขาเบิกจากคลัง, return = สาขาคืนของเข้าคลัง
// เบิกและคืนเสร็จในขั้นเดียว เพราะคนของสาขาหยิบหรือนำของไปเองแล้วบันทึก
export const STOCK_TRANSFER_KINDS = ["transfer", "withdrawal", "return"] as const;
export type StockTransferKind = (typeof STOCK_TRANSFER_KINDS)[number];

export const stockTransfers = mysqlTable("stock_transfers", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", STOCK_TRANSFER_KINDS).default("transfer").notNull(),
  fromBranchId: int("fromBranchId").notNull(),
  toBranchId: int("toBranchId").notNull(),
  status: mysqlEnum("status", ["in_transit", "received", "cancelled"]).default("in_transit").notNull(),
  note: text("note"),
  createdBy: int("createdBy"),
  receivedBy: int("receivedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  receivedAt: timestamp("receivedAt"),
});
export type StockTransfer = typeof stockTransfers.$inferSelect;

export const stockTransferLines = mysqlTable("stock_transfer_lines", {
  id: int("id").autoincrement().primaryKey(),
  transferId: int("transferId").notNull(),
  ingredientId: int("ingredientId").notNull(),
  quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(),
  receivedQuantity: decimal("receivedQuantity", { precision: 14, scale: 3 }),
  unitCost: decimal("unitCost", { precision: 12, scale: 4 }).default("0").notNull(),
}, (t) => [index("stock_transfer_lines_transfer_idx").on(t.transferId)]);
export type StockTransferLine = typeof stockTransferLines.$inferSelect;

// ─── Accounting: กระทบยอดรายวันต่อสาขา ────────────────────────────────────────
// source = "transfer" (โอนเข้าบัญชีร้าน) หรือ slug ของช่องทางเดลิเวอรี (grab, lineman)
export const reconciliations = mysqlTable("reconciliations", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  businessDate: date("businessDate", { mode: "string" }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  grossAmount: decimal("grossAmount", { precision: 12, scale: 2 }).notNull(), // ยอดขายในระบบ ณ ตอนกระทบ
  expectedNet: decimal("expectedNet", { precision: 12, scale: 2 }).notNull(), // หลังหัก GP ตามที่ตั้งไว้
  actualNet: decimal("actualNet", { precision: 12, scale: 2 }).notNull(), // ยอดที่ได้รับจริง
  feeAmount: decimal("feeAmount", { precision: 12, scale: 2 }).default("0").notNull(), // GP ที่ถูกหักจริง
  note: text("note"),
  staffId: int("staffId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [uniqueIndex("reconciliations_branch_date_source_uq").on(t.branchId, t.businessDate, t.source)]);
export type Reconciliation = typeof reconciliations.$inferSelect;
