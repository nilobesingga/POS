import { Router } from 'express';
import { db } from '../storage';
import { discounts } from '../../shared/schema';
import { insertDiscountSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all discounts
router.get('/', async (_req, res) => {
    try {
        const result = await db.select().from(discounts);
        res.json(result);
    } catch (error) {
        console.error('Failed to fetch discounts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a discount
router.post('/', async (req, res) => {
    try {
        const discountData = insertDiscountSchema.parse(req.body);
        const result = await db.insert(discounts).values({
            ...discountData,
            value: discountData.value.toString()
        }).returning();
        res.json(result[0]);
    } catch (error) {
        console.error('Failed to create discount:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a discount
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const discountData = insertDiscountSchema.parse(req.body);

        const result = await db
            .update(discounts)
            .set({
                ...discountData,
                value: discountData.value.toString(),
                updatedAt: new Date()
            })
            .where(eq(discounts.id, parseInt(id)))
            .returning();

        if (!result.length) {
            return res.status(404).json({ error: "Discount not found" });
        }

        res.json(result[0]);
    } catch (error) {
        console.error('Failed to update discount:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a discount
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db
            .delete(discounts)
            .where(eq(discounts.id, parseInt(id)))
            .returning();

        if (!result.length) {
            return res.status(404).json({ error: "Discount not found" });
        }

        res.json(result[0]);
    } catch (error) {
        console.error('Failed to delete discount:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
