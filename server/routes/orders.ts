import { Router } from 'express';
import { db } from '../storage';
import {
    orders,
    orderItems,
    insertOrderSchema,
    products
} from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const router = Router();

// Helper function to generate order number
async function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Get count of orders for today to generate sequence
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
            and(
                gte(orders.createdAt, todayStart),
                lte(orders.createdAt, todayEnd)
            )
        );

    const sequence = (todayOrders.length + 1).toString().padStart(4, '0');
    return `OR${year}${month}${day}${sequence}`;
}

// Get all orders
router.get('/', async (_req, res) => {
    try {
        const result = await db.select().from(orders);
        res.json(result);
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get order by ID with items
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, parseInt(id)));

        if (!order.length) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Explicitly select each column to ensure proper naming and structure
        const items = await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                productId: orderItems.productId,
                quantity: orderItems.quantity,
                price: orderItems.price,
                products: products
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, parseInt(id)));

        // Log out the structure for debugging
        console.log("API response items:", JSON.stringify(items, null, 2));

        res.json({
            order: order[0],
            items
        });
    } catch (error) {
        console.error('Failed to fetch order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new order
router.post('/', async (req, res) => {
    try {
        const { order: orderData, items } = req.body;

        // Generate order number
        const orderNumber = await generateOrderNumber();

        // Validate order data
        const validatedOrder = insertOrderSchema.parse({
            ...orderData,
            orderNumber,
            subtotal: orderData.subtotal.toString(),
            tax: orderData.tax.toString(),
            discount: orderData.discount.toString(),
            total: orderData.total.toString(),
            amountTendered: orderData.amountTendered?.toString() || orderData.total.toString(),
            change: orderData.change?.toString() || "0"
        });

        // Create order in a transaction to ensure all related operations succeed or fail together
        const newOrder = await db.transaction(async (tx) => {
            // Create order
            const [order] = await tx
                .insert(orders)
                .values(validatedOrder)
                .returning();

            // Create order items
            const orderItemsData = items.map((item: any) => ({
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price.toString() // Ensure price is string
            }));

            await tx.insert(orderItems).values(orderItemsData);

            // Update product stock quantities
            for (const item of orderItemsData) {
                const [product] = await tx
                    .select()
                    .from(products)
                    .where(eq(products.id, item.productId));

                if (product) {
                    const newQuantity = product.stockQuantity - item.quantity;
                    await tx
                        .update(products)
                        .set({
                            stockQuantity: Math.max(0, newQuantity),
                            inStock: newQuantity > 0
                        })
                        .where(eq(products.id, item.productId));
                }
            }

            return order;
        });

        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Failed to create order:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Internal server error', message: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

export default router;
