import { Router } from 'express';
import { db } from '../storage';
import { allergens } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { insertAllergenSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get all allergens
router.get('/', async (req, res) => {
    try {
        const allAllergens = await db.select().from(allergens);
        res.json(allAllergens);
    } catch (error) {
        console.error('Failed to fetch allergens:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single allergen by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const allergen = await db.select()
            .from(allergens)
            .where(eq(allergens.id, id));

        if (allergen.length === 0) {
            return res.status(404).json({ error: 'Allergen not found' });
        }

        res.json(allergen[0]);
    } catch (error) {
        console.error('Failed to fetch allergen:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new allergen
router.post('/', async (req, res) => {
    try {
        const allergenData = insertAllergenSchema.parse(req.body);
        const [newAllergen] = await db.insert(allergens)
            .values(allergenData)
            .returning();

        res.status(201).json(newAllergen);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid allergen data', details: error.errors });
        }
        console.error('Failed to create allergen:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update an allergen
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const allergenData = insertAllergenSchema.parse(req.body);

        const [updatedAllergen] = await db.update(allergens)
            .set({
                ...allergenData,
                updatedAt: new Date()
            })
            .where(eq(allergens.id, id))
            .returning();

        if (!updatedAllergen) {
            return res.status(404).json({ error: 'Allergen not found' });
        }

        res.json(updatedAllergen);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid allergen data', details: error.errors });
        }
        console.error('Failed to update allergen:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete an allergen
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.delete(allergens)
            .where(eq(allergens.id, id))
            .returning({ deletedId: allergens.id });

        if (result.length === 0) {
            return res.status(404).json({ error: 'Allergen not found' });
        }

        res.json({ message: 'Allergen deleted successfully' });
    } catch (error) {
        console.error('Failed to delete allergen:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
