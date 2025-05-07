import { pgTable, text, serial, integer, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferModel } from "drizzle-orm";

// User model
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("cashier"),
    email: text("email"),
    phone: text("phone"),
    storeId: integer("store_id").references(() => storeSettings.id),
});

export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
    displayName: true,
    role: true,
    email: true,
    phone: true,
    storeId: true,
});

// Define RolePermissions interface for strong typing
export interface RolePermissions {
    canManageProducts: boolean;
    canManageCategories: boolean;
    canManageOrders: boolean;
    canManageCustomers: boolean;
    canViewCustomers: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
    canManageUsers: boolean;
}

// Roles
export const roles = pgTable("roles", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    permissions: jsonb("permissions").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertRoleSchema = createInsertSchema(roles, {
    name: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
    isSystem: z.boolean().default(false),
    permissions: z.object({
        canManageProducts: z.boolean().default(false),
        canManageCategories: z.boolean().default(false),
        canManageOrders: z.boolean().default(false),
        canManageCustomers: z.boolean().default(false),
        canViewCustomers: z.boolean().default(false),
        canViewReports: z.boolean().default(false),
        canManageSettings: z.boolean().default(false),
        canManageUsers: z.boolean().default(false)
    })
});

// Product Categories
export const categories = pgTable("categories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
    name: true,
});

// Products
export const products = pgTable("products", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    price: numeric("price").notNull(),
    cost: numeric("cost"),
    barcode: text("barcode"),
    description: text("description"),
    categoryId: integer("category_id").references(() => categories.id),
    imageUrl: text("image_url"),
    sku: text("sku"),
    inStock: boolean("in_stock").notNull().default(true),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    soldBy: text("sold_by").notNull().default("each"),
    isTaxable: boolean("is_taxable").notNull().default(true),
    hasAllergens: boolean("has_allergens").notNull().default(false),
    allergens: jsonb("allergens"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).pick({
    name: true,
    price: true,
    cost: true,
    barcode: true,
    description: true,
    categoryId: true,
    imageUrl: true,
    sku: true,
    inStock: true,
    stockQuantity: true,
    soldBy: true,
    isTaxable: true,
    hasAllergens: true,
    allergens: true,
}).extend({
    // Define the allergens schema structure
    allergens: z.array(
        z.object({
            name: z.string(),
            severity: z.enum(["mild", "moderate", "severe"]).optional()
        })
    ).optional().nullable()
});

// Allergens definitions
export const allergens = pgTable("allergens", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    severity: text("severity").notNull().default("moderate"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertAllergenSchema = createInsertSchema(allergens, {
    name: z.string().min(1, "Allergen name is required"),
    description: z.string().nullable(),
    severity: z.enum(["mild", "moderate", "severe"], {
        required_error: "Severity must be mild, moderate, or severe"
    }).default("moderate")
});

// Product Variants
export const productVariants = pgTable("product_variants", {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id).notNull(),
    optionName: text("option_name").notNull(),
    optionValue: text("option_value").notNull(),
    price: numeric("price"),
    cost: numeric("cost"),
    sku: text("sku"),
    barcode: text("barcode"),
    stockQuantity: integer("stock_quantity"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductVariantSchema = createInsertSchema(productVariants).pick({
    productId: true,
    optionName: true,
    optionValue: true,
    price: true,
    cost: true,
    sku: true,
    barcode: true,
    stockQuantity: true,
});

// Product-Store relationship (which products are available in which stores)
export const productStores = pgTable("product_stores", {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id).notNull(),
    storeId: integer("store_id").references(() => storeSettings.id).notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductStoreSchema = createInsertSchema(productStores).pick({
    productId: true,
    storeId: true,
    isAvailable: true,
});

// Product-Modifier relationship (which modifiers are linked to which products)
export const productModifiers = pgTable("product_modifiers", {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id).notNull(),
    modifierId: integer("modifier_id").references(() => modifiers.id).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductModifierSchema = createInsertSchema(productModifiers).pick({
    productId: true,
    modifierId: true,
});

// Order Items
export const orderItems = pgTable("order_items", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id"),
    productId: integer("product_id").references(() => products.id),
    quantity: integer("quantity").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
    orderId: true,
    productId: true,
    quantity: true,
    price: true,
});

// Order Item Modifiers
export const orderItemModifiers = pgTable("order_item_modifiers", {
    id: serial("id").primaryKey(),
    orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
    modifierId: integer("modifier_id").references(() => modifiers.id).notNull(),
    modifierOptionId: integer("modifier_option_id").references(() => modifierOptions.id),
    name: text("name").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderItemModifierSchema = createInsertSchema(orderItemModifiers).pick({
    orderItemId: true,
    modifierId: true,
    modifierOptionId: true,
    name: true,
    price: true,
    quantity: true,
});

export type OrderItemModifier = typeof orderItemModifiers.$inferSelect;
export type InsertOrderItemModifier = z.infer<typeof insertOrderItemModifierSchema>;

// Orders
export const orders = pgTable("orders", {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    customerId: integer("customer_id"),
    storeId: integer("store_id").references(() => storeSettings.id).notNull(),
    userId: integer("user_id").references(() => users.id).notNull(),
    status: text("status").notNull().default("completed"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull(),
    amountTendered: numeric("amount_tendered", { precision: 10, scale: 2 }),
    change: numeric("change", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
    orderNumber: true,
    customerId: true,
    storeId: true,
    userId: true,
    status: true,
    subtotal: true,
    tax: true,
    discount: true,
    total: true,
    paymentMethod: true,
    amountTendered: true,
    change: true,
});

// Kitchen Orders
export const kitchenOrders = pgTable("kitchen_orders", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id).notNull(),
    status: text("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertKitchenOrderSchema = createInsertSchema(kitchenOrders).pick({
    orderId: true,
    status: true,
    priority: true,
    notes: true,
});

// Kitchen Order Items
export const kitchenOrderItems = pgTable("kitchen_order_items", {
    id: serial("id").primaryKey(),
    kitchenOrderId: integer("kitchen_order_id").references(() => kitchenOrders.id).notNull(),
    orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
    status: text("status").notNull().default("pending"),
    preparationTime: integer("preparation_time"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertKitchenOrderItemSchema = createInsertSchema(kitchenOrderItems).pick({
    kitchenOrderId: true,
    orderItemId: true,
    status: true,
    preparationTime: true,
    startedAt: true,
    completedAt: true,
});

// Kitchen Queues
export const kitchenQueues = pgTable("kitchen_queues", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    storeId: integer("store_id").references(() => storeSettings.id).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertKitchenQueueSchema = createInsertSchema(kitchenQueues).pick({
    name: true,
    storeId: true,
    isActive: true,
});

// Kitchen Queue Assignments
export const kitchenQueueAssignments = pgTable("kitchen_queue_assignments", {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id).notNull(),
    queueId: integer("queue_id").references(() => kitchenQueues.id).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertKitchenQueueAssignmentSchema = createInsertSchema(kitchenQueueAssignments).pick({
    productId: true,
    queueId: true,
});

// Store Settings
export const storeSettings = pgTable("store_settings", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    branch: text("branch"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    phone: text("phone"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("8.25"),
    logo: text("logo"),
    showLogo: boolean("show_logo").notNull().default(true),
    showCashierName: boolean("show_cashier_name").notNull().default(true),
    receiptFooter: text("receipt_footer"),
    isActive: boolean("is_active").notNull().default(true),
    currencyCode: text("currency_code").notNull().default("USD"),
    currencySymbol: text("currency_symbol").notNull().default("$"),
    currencySymbolPosition: text("currency_symbol_position").notNull().default("before"),
    decimalSeparator: text("decimal_separator").notNull().default("."),
    thousandsSeparator: text("thousands_separator").notNull().default(","),
    decimalPlaces: integer("decimal_places").notNull().default(2),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettings).pick({
    name: true,
    branch: true,
    address: true,
    city: true,
    state: true,
    zipCode: true,
    phone: true,
    taxRate: true,
    logo: true,
    showLogo: true,
    showCashierName: true,
    receiptFooter: true,
    isActive: true,
    currencyCode: true,
    currencySymbol: true,
    currencySymbolPosition: true,
    decimalSeparator: true,
    thousandsSeparator: true,
    decimalPlaces: true,
    updatedAt: true
});

// Tax Categories
export const taxCategories = pgTable("tax_categories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaxCategorySchema = createInsertSchema(taxCategories).pick({
    name: true,
    rate: true,
    isDefault: true,
});

// Customers
export const customers = pgTable("customers", {
    id: serial("id").primaryKey(),
    customerName: text("customer_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    province: text("province"),
    postalCode: text("postal_code"),
    country: text("country"),
    customerCode: text("customer_code"),
    pointsBalance: numeric("points_balance").notNull().default("0"),
    note: text("note"),
    firstVisit: timestamp("first_visit").notNull().defaultNow(),
    lastVisit: timestamp("last_visit").notNull().defaultNow(),
    totalVisits: integer("total_visits").notNull().default(0),
    totalSpent: numeric("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertCustomerSchema = createInsertSchema(customers, {
    customerName: z.string().min(1, "Customer name is required"),
    email: z.string().email("Invalid email format").nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    postalCode: z.string().nullable(),
    country: z.string().nullable(),
    customerCode: z.string().nullable(),
    pointsBalance: z.number().default(0),
    note: z.string().nullable(),
});

// POS Devices
export const posDevices = pgTable("pos_devices", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    storeId: integer("store_id").references(() => storeSettings.id).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPOSDeviceSchema = createInsertSchema(posDevices, {
    name: z.string().min(1, "Device name is required"),
    storeId: z.number().int().positive("Store ID is required"),
    isActive: z.boolean().default(true)
});

// Payment Types
export const paymentTypes = pgTable("payment_types", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPaymentTypeSchema = createInsertSchema(paymentTypes, {
    name: z.string().min(1, "Payment type name is required"),
    code: z.string().min(1, "Payment type code is required")
});

// Dining Options
export const diningOptions = pgTable("dining_options", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    storeId: integer("store_id").references(() => storeSettings.id).notNull(),
    available: boolean("available").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertDiningOptionSchema = createInsertSchema(diningOptions, {
    name: z.string().min(1, "Dining option name is required"),
    storeId: z.number().int().positive("Store ID is required"),
    available: z.boolean().default(true),
    isDefault: z.boolean().default(false)
});

// Shifts
export const shifts = pgTable("shifts", {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").references(() => storeSettings.id).notNull(),
    userId: integer("user_id").references(() => users.id).notNull(),
    openingTime: timestamp("opening_time").notNull().defaultNow(),
    closingTime: timestamp("closing_time"),
    expectedCashAmount: numeric("expected_cash_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    actualCashAmount: numeric("actual_cash_amount", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertShiftSchema = createInsertSchema(shifts, {
    storeId: z.number().int().positive("Store ID is required"),
    userId: z.number().int().positive("User ID is required"),
    openingTime: z.date().default(() => new Date()),
    closingTime: z.date().optional().nullable(),
    expectedCashAmount: z.number().default(0),
    actualCashAmount: z.number().optional().nullable(),
    isActive: z.boolean().default(true),
    notes: z.string().optional().nullable(),
});

// Modifiers
export const modifiers = pgTable("modifiers", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    storeId: integer("store_id").references(() => storeSettings.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertModifierSchema = createInsertSchema(modifiers, {
    name: z.string().min(1, "Modifier name is required"),
    storeId: z.number().int().positive().nullable()
});

// Modifier Options
export const modifierOptions = pgTable("modifier_options", {
    id: serial("id").primaryKey(),
    modifierId: integer("modifier_id").references(() => modifiers.id).notNull(),
    name: text("name").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertModifierOptionSchema = createInsertSchema(modifierOptions).pick({
    modifierId: true,
    name: true,
    price: true,
});

// Discounts
export const discounts = pgTable("discounts", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    type: text("type").notNull(),
    storeId: integer("store_id").references(() => storeSettings.id),
    restrictedAccess: boolean("restricted_access").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertDiscountSchema = createInsertSchema(discounts, {
    name: z.string().min(1, "Discount name is required"),
    value: z.number().positive("Value must be greater than 0"),
    type: z.enum(["percent", "amount"], {
        required_error: "Type must be either 'percent' or 'amount'"
    }),
    storeId: z.number().int().positive("Store ID is required").nullable(),
    restrictedAccess: z.boolean().default(false)
});

export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;

export type POSDevice = InferModel<typeof posDevices>;
export type InsertPOSDevice = z.infer<typeof insertPOSDeviceSchema>;

export type PaymentType = typeof paymentTypes.$inferSelect;
export type InsertPaymentType = z.infer<typeof insertPaymentTypeSchema>;

export type DiningOption = typeof diningOptions.$inferSelect;
export type InsertDiningOption = z.infer<typeof insertDiningOptionSchema>;

export type Modifier = typeof modifiers.$inferSelect;
export type InsertModifier = z.infer<typeof insertModifierSchema>;

export type ModifierOption = typeof modifierOptions.$inferSelect;
export type InsertModifierOption = z.infer<typeof insertModifierOptionSchema>;

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;

export type ProductStore = typeof productStores.$inferSelect;
export type InsertProductStore = z.infer<typeof insertProductStoreSchema>;

export type ProductModifier = typeof productModifiers.$inferSelect;
export type InsertProductModifier = z.infer<typeof insertProductModifierSchema>;

export type KitchenOrder = typeof kitchenOrders.$inferSelect;
export type InsertKitchenOrder = z.infer<typeof insertKitchenOrderSchema>;

export type KitchenOrderItem = typeof kitchenOrderItems.$inferSelect;
export type InsertKitchenOrderItem = z.infer<typeof insertKitchenOrderItemSchema>;

export type KitchenQueue = typeof kitchenQueues.$inferSelect;
export type InsertKitchenQueue = z.infer<typeof insertKitchenQueueSchema>;

export type KitchenQueueAssignment = typeof kitchenQueueAssignments.$inferSelect;
export type InsertKitchenQueueAssignment = z.infer<typeof insertKitchenQueueAssignmentSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type StoreSettings = typeof storeSettings.$inferSelect;
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;

export type TaxCategory = typeof taxCategories.$inferSelect;
export type InsertTaxCategory = z.infer<typeof insertTaxCategorySchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Role = typeof roles.$inferSelect & { permissions: RolePermissions };
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

// Custom types for the frontend
export type CartItem = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    totalPrice: number;
};

export type Cart = {
    items: CartItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    customerId?: number | null;
};
