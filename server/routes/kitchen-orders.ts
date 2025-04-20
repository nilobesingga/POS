import { Router } from 'express';
import { db } from '../storage';
import {
    kitchenOrders,
    kitchenOrderItems,
    orders,
    orderItems,
    products
} from '../../shared/schema';
import { eq, and, gte, lte, sql, SQL } from 'drizzle-orm';
import { insertKitchenOrderSchema, insertKitchenOrderItemSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get all kitchen orders
router.get('/', async (req, res) => {
    try {
        const status = req.query.status as string | undefined;
        const storeId = req.query.storeId as string | undefined;

        // Build conditions array based on filters
        const whereConditions: SQL[] = [];

        if (status) {
            whereConditions.push(eq(kitchenOrders.status, status));
        }

        if (storeId) {
            whereConditions.push(eq(orders.storeId, parseInt(storeId)));
        }

        // Create a base query
        const baseQuery = db.select({
            kitchenOrder: kitchenOrders,
            order: orders
        })
            .from(kitchenOrders)
            .innerJoin(orders, eq(kitchenOrders.orderId, orders.id));

        // Execute query with or without conditions
        const result = whereConditions.length > 0
            ? await baseQuery.where(and(...whereConditions)).orderBy(sql`${kitchenOrders.priority} DESC, ${kitchenOrders.createdAt} ASC`)
            : await baseQuery.orderBy(sql`${kitchenOrders.priority} DESC, ${kitchenOrders.createdAt} ASC`);

        // Format the response
        const kitchenOrdersWithDetails = await Promise.all(result.map(async ({ kitchenOrder, order }) => {
            // Get kitchen order items
            const kitchenOrderItemsData = await db.select({
                kitchenOrderItem: kitchenOrderItems,
                orderItem: orderItems,
                product: products
            })
                .from(kitchenOrderItems)
                .innerJoin(orderItems, eq(kitchenOrderItems.orderItemId, orderItems.id))
                .innerJoin(products, eq(orderItems.productId, products.id))
                .where(eq(kitchenOrderItems.kitchenOrderId, kitchenOrder.id));

            return {
                ...kitchenOrder,
                order,
                items: kitchenOrderItemsData.map(({ kitchenOrderItem, orderItem, product }) => ({
                    ...kitchenOrderItem,
                    orderItem,
                    product
                }))
            };
        }));

        res.json(kitchenOrdersWithDetails);
    } catch (error) {
        console.error('Failed to fetch kitchen orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get kitchen order by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const kitchenOrderId = parseInt(id);

        if (isNaN(kitchenOrderId)) {
            return res.status(400).json({ error: 'Invalid kitchen order ID' });
        }

        const kitchenOrderResult = await db.select({
            kitchenOrder: kitchenOrders,
            order: orders
        })
            .from(kitchenOrders)
            .innerJoin(orders, eq(kitchenOrders.orderId, orders.id))
            .where(eq(kitchenOrders.id, kitchenOrderId));

        if (kitchenOrderResult.length === 0) {
            return res.status(404).json({ error: 'Kitchen order not found' });
        }

        const { kitchenOrder, order } = kitchenOrderResult[0];

        // Get kitchen order items
        const kitchenOrderItemsData = await db.select({
            kitchenOrderItem: kitchenOrderItems,
            orderItem: orderItems,
            product: products
        })
            .from(kitchenOrderItems)
            .innerJoin(orderItems, eq(kitchenOrderItems.orderItemId, orderItems.id))
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(kitchenOrderItems.kitchenOrderId, kitchenOrder.id));

        const result = {
            ...kitchenOrder,
            order,
            items: kitchenOrderItemsData.map(({ kitchenOrderItem, orderItem, product }) => ({
                ...kitchenOrderItem,
                orderItem,
                product
            }))
        };

        res.json(result);
    } catch (error) {
        console.error('Failed to fetch kitchen order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a kitchen order
router.post('/', async (req, res) => {
    try {
        const { order, items = [] } = req.body;

        // Start a transaction
        const result = await db.transaction(async (tx) => {
            // Create the kitchen order
            const [kitchenOrder] = await tx.insert(kitchenOrders)
                .values(insertKitchenOrderSchema.parse(order))
                .returning();

            // Create kitchen order items
            if (items.length > 0) {
                for (const item of items) {
                    await tx.insert(kitchenOrderItems)
                        .values({
                            ...insertKitchenOrderItemSchema.parse(item),
                            kitchenOrderId: kitchenOrder.id
                        });
                }
            }

            return kitchenOrder;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Failed to create kitchen order:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid kitchen order data',
                details: error.errors
            });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update kitchen order status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const [updated] = await db.update(kitchenOrders)
            .set({
                status,
                updatedAt: new Date()
            })
            .where(eq(kitchenOrders.id, parseInt(id)))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Kitchen order not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Failed to update kitchen order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update kitchen order item status
router.patch('/items/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const itemId = parseInt(id);
        const now = new Date();

        const updateData: any = {
            status,
            updatedAt: now
        };

        // Set started_at timestamp when moving to in-progress
        if (status === 'in-progress') {
            updateData.startedAt = now;
        }

        // Set completed_at timestamp when completing the item
        if (status === 'completed') {
            updateData.completedAt = now;
        }

        const [updated] = await db.update(kitchenOrderItems)
            .set(updateData)
            .where(eq(kitchenOrderItems.id, itemId))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Kitchen order item not found' });
        }

        // Check if all items are completed to update the parent kitchen order
        if (status === 'completed') {
            const items = await db.select()
                .from(kitchenOrderItems)
                .where(eq(kitchenOrderItems.kitchenOrderId, updated.kitchenOrderId));

            const allCompleted = items.every(item => item.status === 'completed');

            if (allCompleted) {
                await db.update(kitchenOrders)
                    .set({
                        status: 'completed',
                        updatedAt: now
                    })
                    .where(eq(kitchenOrders.id, updated.kitchenOrderId));
            }
        }

        res.json(updated);
    } catch (error) {
        console.error('Failed to update kitchen order item status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;