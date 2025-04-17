import { Router } from 'express';
import { db } from '../storage';
import { storeSettings } from '../../shared/schema';
import { insertStoreSettingsSchema } from '@shared/schema';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure upload directory with absolute path
const uploadDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for logo uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

const router = Router();

// Get all stores
router.get('/', async (_req, res) => {
    try {
        const stores = await db.select().from(storeSettings);
        res.json(stores);
    } catch (error) {
        console.error('Failed to fetch stores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single store
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [store] = await db.select().from(storeSettings).where(eq(storeSettings.id, id));

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json(store);
    } catch (error) {
        console.error('Failed to fetch store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new store
router.post('/', async (req, res) => {
    try {
        const storeData = {
            ...req.body,
            updatedAt: new Date()
        };

        const validatedData = insertStoreSettingsSchema.parse(storeData);
        const [store] = await db.insert(storeSettings)
            .values(validatedData)
            .returning();

        res.status(201).json(store);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid store data',
                details: error.errors
            });
        }
        console.error('Failed to create store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a store
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const storeData = {
            ...req.body,
            updatedAt: new Date()
        };

        const validatedData = insertStoreSettingsSchema.parse(storeData);
        const [updated] = await db.update(storeSettings)
            .set(validatedData)
            .where(eq(storeSettings.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid store data',
                details: error.errors
            });
        }
        console.error('Failed to update store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a store (soft delete by setting isActive to false)
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [deleted] = await db.update(storeSettings)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(storeSettings.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json(deleted);
    } catch (error) {
        console.error('Failed to delete store:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Upload logo for a specific store
router.post('/:id/logo', upload.single('logo'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get store
        const [store] = await db.select().from(storeSettings).where(eq(storeSettings.id, id));
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // Delete old logo if it exists
        if (store.logo) {
            const oldLogoPath = path.join(uploadDir, path.basename(store.logo));
            if (fs.existsSync(oldLogoPath)) {
                fs.unlinkSync(oldLogoPath);
            }
        }

        // Update store with new logo path
        const logoUrl = `/uploads/logos/${req.file.filename}`;
        const [updated] = await db.update(storeSettings)
            .set({
                logo: logoUrl,
                updatedAt: new Date()
            })
            .where(eq(storeSettings.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error('Failed to upload logo:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

export default router;
