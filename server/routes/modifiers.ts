import { Router } from 'express';
import { db } from '../storage';
import { modifiers, modifierOptions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Get all modifiers
router.get('/', async (_req, res) => {
    try {
        const result = await db.select().from(modifiers);
        res.json(result);
    } catch (error) {
        console.error('Failed to fetch modifiers:', error);
        res.status(500).json({
            error: 'Failed to fetch modifiers',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get a single modifier with its options
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid modifier ID' });
        }

        const modifier = await db.select().from(modifiers).where(eq(modifiers.id, id));

        if (modifier.length === 0) {
            return res.status(404).json({ error: 'Modifier not found' });
        }

        const options = await db.select().from(modifierOptions).where(eq(modifierOptions.modifierId, id));

        res.json({
            ...modifier[0],
            options
        });
    } catch (error) {
        console.error('Failed to fetch modifier:', error);
        res.status(500).json({
            error: 'Failed to fetch modifier',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create a new modifier
router.post('/', async (req, res) => {
    try {
        const { name, storeId } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Modifier name is required' });
        }

        const [created] = await db.insert(modifiers).values({
            name,
            storeId: storeId || null
        }).returning();

        res.status(201).json(created);
    } catch (error) {
        console.error('Failed to create modifier:', error);
        res.status(500).json({
            error: 'Failed to create modifier',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update a modifier
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, storeId } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid modifier ID' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Modifier name is required' });
        }

        const [updated] = await db.update(modifiers)
            .set({
                name,
                storeId: storeId || null,
                updatedAt: new Date()
            })
            .where(eq(modifiers.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Modifier not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Failed to update modifier:', error);
        res.status(500).json({
            error: 'Failed to update modifier',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete a modifier (and all its options)
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid modifier ID' });
        }

        // First delete all options for this modifier
        await db.delete(modifierOptions)
            .where(eq(modifierOptions.modifierId, id));

        // Then delete the modifier itself
        const [deleted] = await db.delete(modifiers)
            .where(eq(modifiers.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Modifier not found' });
        }

        res.json(deleted);
    } catch (error) {
        console.error('Failed to delete modifier:', error);
        res.status(500).json({
            error: 'Failed to delete modifier',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// MODIFIER OPTIONS ROUTES

// Get all options for a modifier
router.get('/:modifierId/options', async (req, res) => {
    try {
        const modifierId = parseInt(req.params.modifierId);

        if (isNaN(modifierId)) {
            return res.status(400).json({ error: 'Invalid modifier ID' });
        }

        const options = await db.select()
            .from(modifierOptions)
            .where(eq(modifierOptions.modifierId, modifierId));

        res.json(options);
    } catch (error) {
        console.error('Failed to fetch modifier options:', error);
        res.status(500).json({
            error: 'Failed to fetch modifier options',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Add an option to a modifier
router.post('/:modifierId/options', async (req, res) => {
    try {
        const modifierId = parseInt(req.params.modifierId);
        const { name, price } = req.body;

        if (isNaN(modifierId)) {
            return res.status(400).json({ error: 'Invalid modifier ID' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Option name is required' });
        }

        // Check if the modifier exists
        const modifierExists = await db.select({ id: modifiers.id })
            .from(modifiers)
            .where(eq(modifiers.id, modifierId));

        if (modifierExists.length === 0) {
            return res.status(404).json({ error: 'Modifier not found' });
        }

        const [created] = await db.insert(modifierOptions)
            .values({
                modifierId,
                name,
                price: price || 0
            })
            .returning();

        res.status(201).json(created);
    } catch (error) {
        console.error('Failed to add modifier option:', error);
        res.status(500).json({
            error: 'Failed to add modifier option',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update a modifier option
router.put('/:modifierId/options/:optionId', async (req, res) => {
    try {
        const modifierId = parseInt(req.params.modifierId);
        const optionId = parseInt(req.params.optionId);
        const { name, price } = req.body;

        if (isNaN(modifierId) || isNaN(optionId)) {
            return res.status(400).json({ error: 'Invalid IDs provided' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Option name is required' });
        }

        const [updated] = await db.update(modifierOptions)
            .set({
                name,
                price: price || 0,
                updatedAt: new Date()
            })
            .where(
                and(
                    eq(modifierOptions.id, optionId),
                    eq(modifierOptions.modifierId, modifierId)
                )
            )
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Modifier option not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Failed to update modifier option:', error);
        res.status(500).json({
            error: 'Failed to update modifier option',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete a modifier option
router.delete('/:modifierId/options/:optionId', async (req, res) => {
    try {
        const modifierId = parseInt(req.params.modifierId);
        const optionId = parseInt(req.params.optionId);

        if (isNaN(modifierId) || isNaN(optionId)) {
            return res.status(400).json({ error: 'Invalid IDs provided' });
        }

        const [deleted] = await db.delete(modifierOptions)
            .where(
                and(
                    eq(modifierOptions.id, optionId),
                    eq(modifierOptions.modifierId, modifierId)
                )
            )
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Modifier option not found' });
        }

        res.json(deleted);
    } catch (error) {
        console.error('Failed to delete modifier option:', error);
        res.status(500).json({
            error: 'Failed to delete modifier option',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
