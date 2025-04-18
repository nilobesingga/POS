import { Router } from 'express';
import { db } from '../storage';
import { roles } from '../../shared/schema';
import { insertRoleSchema } from '@shared/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all roles
router.get('/', async (_req, res) => {
    try {
        const result = await db.select().from(roles);
        res.json(result);
    } catch (error) {
        console.error('Failed to fetch roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get role by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [role] = await db.select().from(roles).where(eq(roles.id, id));

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json(role);
    } catch (error) {
        console.error('Failed to fetch role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get role by name
router.get('/by-name/:name', async (req, res) => {
    try {
        const name = req.params.name;
        const [role] = await db.select().from(roles).where(eq(roles.name, name));

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json(role);
    } catch (error) {
        console.error('Failed to fetch role by name:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new role
router.post('/', async (req, res) => {
    try {
        const roleData = insertRoleSchema.parse(req.body);

        // Check if role name is unique
        const existingRole = await db.select({ id: roles.id })
            .from(roles)
            .where(eq(roles.name, roleData.name));

        if (existingRole.length > 0) {
            return res.status(400).json({
                error: 'Role with this name already exists',
                field: 'name'
            });
        }

        const [created] = await db.insert(roles)
            .values({
                ...roleData,
                updatedAt: new Date()
            })
            .returning();

        res.status(201).json(created);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid role data',
                details: error.errors
            });
        }
        console.error('Failed to create role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a role
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Check if role exists and is not a system role
        const [existingRole] = await db.select().from(roles).where(eq(roles.id, id));

        if (!existingRole) {
            return res.status(404).json({ error: 'Role not found' });
        }

        if (existingRole.isSystem) {
            return res.status(403).json({ error: 'System roles cannot be modified' });
        }

        const roleData = insertRoleSchema.parse(req.body);

        // Check if updated name conflicts with another role
        if (roleData.name !== existingRole.name) {
            const nameCheck = await db.select({ id: roles.id })
                .from(roles)
                .where(eq(roles.name, roleData.name));

            if (nameCheck.length > 0 && nameCheck[0].id !== id) {
                return res.status(400).json({
                    error: 'Role with this name already exists',
                    field: 'name'
                });
            }
        }

        const [updated] = await db.update(roles)
            .set({
                ...roleData,
                updatedAt: new Date()
            })
            .where(eq(roles.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid role data',
                details: error.errors
            });
        }
        console.error('Failed to update role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a role
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Check if role is a system role
        const [existingRole] = await db.select().from(roles).where(eq(roles.id, id));

        if (!existingRole) {
            return res.status(404).json({ error: 'Role not found' });
        }

        if (existingRole.isSystem) {
            return res.status(403).json({ error: 'System roles cannot be deleted' });
        }

        const [deleted] = await db.delete(roles)
            .where(eq(roles.id, id))
            .returning();

        res.json(deleted);
    } catch (error) {
        console.error('Failed to delete role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
