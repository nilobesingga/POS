import { Router } from 'express';
import { db } from '../storage';
import {
    kitchenQueues,
    kitchenQueueAssignments,
    products
} from '../../shared/schema';
import { eq, and, SQL } from 'drizzle-orm';
import { insertKitchenQueueSchema, insertKitchenQueueAssignmentSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get all kitchen queues
router.get('/', async (req, res) => {
    try {
        const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;

        // Build conditions array based on filters
        const whereConditions: SQL[] = [];

        if (storeId) {
            whereConditions.push(eq(kitchenQueues.storeId, storeId));
        }

        // Create a base query
        const baseQuery = db.select().from(kitchenQueues);

        // Execute query with or without conditions
        const result = whereConditions.length > 0
            ? await baseQuery.where(and(...whereConditions)).orderBy(kitchenQueues.name)
            : await baseQuery.orderBy(kitchenQueues.name);

        res.json(result);
    } catch (error) {
        console.error('Failed to fetch kitchen queues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get queue by ID with assigned products
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
router.post('/assignments', async (req, res) => {
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
router.delete('/assignments/:id', async (req, res) => {
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
