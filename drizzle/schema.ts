import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

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
  role: mysqlEnum("role", ["staff", "manager"]).default("staff").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
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
  salesChannel: mysqlEnum("salesChannel", ["walkin", "grab"]).notNull(),
  status: mysqlEnum("status", ["completed", "cancelled"]).default("completed").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "transfer"]).notNull(),
  cashReceived: decimal("cashReceived", { precision: 10, scale: 2 }),
  changeAmount: decimal("changeAmount", { precision: 10, scale: 2 }),
  cancelledBy: varchar("cancelledBy", { length: 100 }),
  cancelReason: text("cancelReason"),
  cancelledAt: timestamp("cancelledAt"),
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
