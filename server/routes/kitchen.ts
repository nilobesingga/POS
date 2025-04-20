import { Router } from 'express';
import { db } from '../storage';
import {
    kitchenOrders,
    kitchenOrderItems,
    kitchenQueues,
    kitchenQueueAssignments,
    orders,
    orderItems,
    products
} from '../../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
    insertKitchenOrderSchema,
    insertKitchenOrderItemSchema,
    insertKitchenQueueSchema,
    insertKitchenQueueAssignmentSchema
} from '@shared/schema';
import { z } from 'zod';

const router = Router();

// ----------------
// KITCHEN ORDERS ROUTES
// ----------------

// Get all kitchen orders
router.get('/orders', async (req, res) => {
    try {
        const status = req.query.status as string | undefined;
        const storeId = req.query.storeId as string | undefined;

        let query = db.select({
            kitchenOrder: kitchenOrders,
            order: orders
        })
            .from(kitchenOrders)
            .innerJoin(orders, eq(kitchenOrders.orderId, orders.id))
            .orderBy(sql`${kitchenOrders.priority} DESC, ${kitchenOrders.createdAt} ASC`);

        // Apply filters if provided
        if (status) {
            query = query.where(eq(kitchenOrders.status, status));
        }

        if (storeId) {
            query = query.where(eq(orders.storeId, parseInt(storeId)));
        }

        const result = await query;

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
router.get('/orders/:id', async (req, res) => {
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
router.post('/orders', async (req, res) => {
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
router.patch('/orders/:id/status', async (req, res) => {
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
router.patch('/orders/items/:id/status', async (req, res) => {
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

// ----------------
// KITCHEN QUEUES ROUTES
// ----------------

// Get all kitchen queues
router.get('/queues', async (req, res) => {
    try {
        const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;

        let query = db.select().from(kitchenQueues);

        if (storeId) {
            query = query.where(eq(kitchenQueues.storeId, storeId));
        }

        const result = await query.orderBy(kitchenQueues.name);

        res.json(result);
    } catch (error) {
        console.error('Failed to fetch kitchen queues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get queue by ID with assigned products
router.get('/queues/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const queueId = parseInt(id);

        if (isNaN(queueId)) {
            return res.status(400).json({ error: 'Invalid queue ID' });
        }

        const queue = await db.select().from(kitchenQueues).where(eq(kitchenQueues.id, queueId));

        if (queue.length === 0) {
            return res.status(404).json({ error: 'Kitchen queue not found' });
        }

        // Get assigned products
        const assignments = await db.select({
            assignment: kitchenQueueAssignments,
            product: products
        })
            .from(kitchenQueueAssignments)
            .innerJoin(products, eq(kitchenQueueAssignments.productId, products.id))
            .where(eq(kitchenQueueAssignments.queueId, queueId));

        const assignedProducts = assignments.map(({ assignment, product }) => ({
            assignmentId: assignment.id,
            product
        }));

        res.json({
            ...queue[0],
            assignedProducts
        });
    } catch (error) {
        console.error('Failed to fetch kitchen queue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a kitchen queue
router.post('/queues', async (req, res) => {
    try {
        const queueData = insertKitchenQueueSchema.parse(req.body);

        const [created] = await db.insert(kitchenQueues)
            .values(queueData)
            .returning();

        res.status(201).json(created);
    } catch (error) {
        console.error('Failed to create kitchen queue:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid kitchen queue data',
                details: error.errors
            });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a kitchen queue
router.put('/queues/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const queueData = insertKitchenQueueSchema.parse(req.body);

        const [updated] = await db.update(kitchenQueues)
            .set({
                ...queueData,
                updatedAt: new Date()
            })
            .where(eq(kitchenQueues.id, parseInt(id)))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Kitchen queue not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Failed to update kitchen queue:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid kitchen queue data',
                details: error.errors
            });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a kitchen queue
router.delete('/queues/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const queueId = parseInt(id);

        // First delete all assignments for this queue
        await db.delete(kitchenQueueAssignments)
            .where(eq(kitchenQueueAssignments.queueId, queueId));

        // Then delete the queue
        const [deleted] = await db.delete(kitchenQueues)
            .where(eq(kitchenQueues.id, queueId))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Kitchen queue not found' });
        }

        res.json({ message: 'Kitchen queue deleted successfully' });
    } catch (error) {
        console.error('Failed to delete kitchen queue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Assign a product to a queue
router.post('/queues/assignments', async (req, res) => {
    try {
        const assignmentData = insertKitchenQueueAssignmentSchema.parse(req.body);

        // Check if this assignment already exists
        const existing = await db.select()
            .from(kitchenQueueAssignments)
            .where(
                and(
                    eq(kitchenQueueAssignments.productId, assignmentData.productId),
                    eq(kitchenQueueAssignments.queueId, assignmentData.queueId)
                )
            );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'This product is already assigned to this queue' });
        }

        const [created] = await db.insert(kitchenQueueAssignments)
            .values(assignmentData)
            .returning();

        res.status(201).json(created);
    } catch (error) {
        console.error('Failed to assign product to queue:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid assignment data',
                details: error.errors
            });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove a product from a queue
router.delete('/queues/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [deleted] = await db.delete(kitchenQueueAssignments)
            .where(eq(kitchenQueueAssignments.id, parseInt(id)))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        res.json({ message: 'Product removed from queue successfully' });
    } catch (error) {
        console.error('Failed to remove product from queue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;