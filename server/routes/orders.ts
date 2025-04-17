import { Router } from 'express';
import { db } from '../storage';
import {
    orders,
    orderItems,
    insertOrderSchema,
    products
} from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

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

        // Validate order data
        const validatedOrder = insertOrderSchema.parse({
            ...orderData,
            subtotal: orderData.subtotal.toString(),
            tax: orderData.tax.toString(),
            discount: orderData.discount.toString(),
            total: orderData.total.toString(),
            amountTendered: orderData.amountTendered.toString(),
            change: orderData.change.toString()
        });

        // Create order
        const [newOrder] = await db
            .insert(orders)
            .values(validatedOrder)
            .returning();

        // Create order items
        const orderItemsData = items.map((item: any) => ({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
        }));

        await db.insert(orderItems).values(orderItemsData);

        // Update product stock quantities
        for (const item of orderItemsData) {
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, item.productId));

            if (product.length) {
                const newQuantity = product[0].stockQuantity - item.quantity;
                await db
                    .update(products)
                    .set({
                        stockQuantity: Math.max(0, newQuantity),
                        inStock: newQuantity > 0
                    })
                    .where(eq(products.id, item.productId));
            }
        }

        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Failed to create order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
