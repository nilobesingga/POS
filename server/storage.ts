import {
    users, type User, type InsertUser,
    categories, type Category, type InsertCategory,
    products, type Product, type InsertProduct,
    orders, type Order, type InsertOrder,
    orderItems, type OrderItem, type InsertOrderItem,
    storeSettings, type StoreSettings, type InsertStoreSettings
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../shared/schema";
import dotenv from "dotenv";
import { eq, gte, lte, and } from "drizzle-orm";
dotenv.config();

type ExtendedOrderItem = OrderItem & { product?: Product };

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export class PostgresStorage {
    // Users
    async getUser(id: number): Promise<User | undefined> {
        const result = await db.select().from(users).where(eq(users.id, id));
        return result[0];
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const result = await db.select().from(users).where(eq(users.username, username));
        return result[0];
    }

    async createUser(user: InsertUser): Promise<User> {
        const [created] = await db.insert(users).values(user).returning();
        return created;
    }

    // Categories
    async getCategories(): Promise<Category[]> {
        return await db.select().from(categories);
    }

    async getCategory(id: number): Promise<Category | undefined> {
        const result = await db.select().from(categories).where(eq(categories.id, id));
        return result[0];
    }

    async createCategory(category: InsertCategory): Promise<Category> {
        const [created] = await db.insert(categories).values(category).returning();
        return created;
    }

    // Products
    async getProducts(): Promise<Product[]> {
        return await db.select().from(products);
    }

    async getProduct(id: number): Promise<Product | undefined> {
        const result = await db.select().from(products).where(eq(products.id, id));
        return result[0];
    }

    async getProductsByCategory(categoryId: number): Promise<Product[]> {
        return await db.select().from(products).where(eq(products.categoryId, categoryId));
    }

    async createProduct(product: InsertProduct): Promise<Product> {
        const [created] = await db.insert(products).values(product).returning();
        return created;
    }

    async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
        const [updated] = await db.update(products)
            .set(product)
            .where(eq(products.id, id))
            .returning();
        return updated;
    }

    // Orders
    async getOrders(): Promise<Order[]> {
        return await db.select().from(orders);
    }

    async getOrder(id: number): Promise<Order | undefined> {
        const result = await db.select().from(orders).where(eq(orders.id, id));
        return result[0];
    }

    async getOrderWithItems(id: number): Promise<{ order: Order, items: ExtendedOrderItem[] } | undefined> {
        const order = await this.getOrder(id);
        if (!order) return undefined;

        const items = await db.select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            price: orderItems.price,
            product: products
        })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, id));

        return {
            order,
            items: items.map(item => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                product: item.product || undefined
            }))
        };
    }

    async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
        const [createdOrder] = await db.insert(orders).values(order).returning();

        const orderItemData = items.map(item => ({
            ...item,
            orderId: createdOrder.id,
        }));

        await db.insert(orderItems).values(orderItemData);

        // Optionally update product stock here too
        for (const item of orderItemData) {
            const product = await this.getProduct(item.productId ?? 0);
            if (product) {
                const newQty = product.stockQuantity - item.quantity;
                await this.updateProduct(product.id, {
                    stockQuantity: newQty,
                    inStock: newQty > 0
                });
            }
        }

        return createdOrder;
    }

    // Order Items
    async getOrderItems(orderId: number): Promise<OrderItem[]> {
        return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    }

    // Reports (basic structure only)
    async getSalesReport(startDate: Date, endDate: Date): Promise<any> {
        const ordersInRange = await db.select().from(orders)
            .where(and(
                gte(orders.createdAt, startDate),
                lte(orders.createdAt, endDate)
            ));

        const totalSales = ordersInRange.reduce((sum, o) => sum + Number(o.total), 0);
        const orderCount = ordersInRange.length;

        // Top products (manual count, could use raw SQL)
        const allItems = await db.select().from(orderItems);
        const productTotals: Record<number, { name: string, quantity: number, total: number }> = {};

        for (const item of allItems) {
            const order = ordersInRange.find(o => o.id === item.orderId);
            if (!order) continue;

            const product = await this.getProduct(item.productId ?? 0);
            if (!product) continue;

            if (!productTotals[product.id]) {
                productTotals[product.id] = {
                    name: product.name,
                    quantity: 0,
                    total: 0,
                };
            }

            productTotals[product.id].quantity += item.quantity;
            productTotals[product.id].total += Number(item.price) * item.quantity;
        }

        const topProducts = Object.entries(productTotals)
            .map(([id, data]) => ({ productId: Number(id), ...data }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        return {
            startDate,
            endDate,
            totalSales,
            orderCount,
            topProducts,
        };
    }

    // Store Settings
    async getStoreSettings(): Promise<StoreSettings | undefined> {
        const result = await db.select().from(storeSettings).limit(1);
        return result[0];
    }

    async updateStoreSettings(settings: Partial<InsertStoreSettings>): Promise<StoreSettings> {
        const existing = await this.getStoreSettings();

        if (existing) {
            const [updated] = await db.update(storeSettings)
                .set(settings)
                .where(eq(storeSettings.id, existing.id))
                .returning();
            return updated;
        } else {
            const [created] = await db.insert(storeSettings)
                .values({
                    name: settings.name || "My Store",
                    taxRate: settings.taxRate || "8.25",
                    showLogo: settings.showLogo ?? true,
                    showCashierName: settings.showCashierName ?? true,
                    ...settings
                })
                .returning();
            return created;
        }
    }
}

export const storage = new PostgresStorage();
