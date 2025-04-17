import { Router } from 'express';
import { db } from '../storage';
import { taxCategories } from '../../shared/schema';
import { insertTaxCategorySchema } from '@shared/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all tax categories
router.get('/', async (_req, res) => {
    try {
        const result = await db.select().from(taxCategories);
        res.json(result);
    } catch (error) {
        console.error('Failed to fetch tax categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a tax category
router.post('/', async (req, res) => {
    try {
        const categoryData = insertTaxCategorySchema.parse(req.body);

        // If this is marked as default, unset any existing default
        if (categoryData.isDefault) {
            await db.update(taxCategories)
                .set({ isDefault: false })
                .where(eq(taxCategories.isDefault, true));
        }

        const [created] = await db.insert(taxCategories)
            .values(categoryData)
            .returning();

        res.status(201).json(created);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid tax category data', details: error.errors });
        }
        console.error('Failed to create tax category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a tax category
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const categoryData = insertTaxCategorySchema.parse(req.body);

        // If this is marked as default, unset any existing default
        if (categoryData.isDefault) {
            await db.update(taxCategories)
                .set({ isDefault: false })
                .where(eq(taxCategories.isDefault, true));
        }

        const [updated] = await db.update(taxCategories)
            .set(categoryData)
            .where(eq(taxCategories.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Tax category not found' });
        }

        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid tax category data', details: error.errors });
        }
        console.error('Failed to update tax category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a tax category
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [deleted] = await db.delete(taxCategories)
            .where(eq(taxCategories.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Tax category not found' });
        }

        res.json(deleted);
    } catch (error) {
        console.error('Failed to delete tax category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
