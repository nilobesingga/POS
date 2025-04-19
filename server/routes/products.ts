import { Router } from 'express';
import { db } from '../storage';
import {
    products,
    productVariants,
    productStores,
    productModifiers
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import {
    insertProductSchema,
    insertProductVariantSchema,
    insertProductStoreSchema,
    insertProductModifierSchema
} from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get all products with details
router.get('/', async (req, res) => {
    try {
        const allProducts = await db.select().from(products);

        // For each product, fetch its variants, stores, and modifiers
        const productsWithDetails = await Promise.all(
            allProducts.map(async (product) => {
                const variants = await db.select()
                    .from(productVariants)
                    .where(eq(productVariants.productId, product.id));

                const stores = await db.select()
                    .from(productStores)
                    .where(eq(productStores.productId, product.id));

                const modifiers = await db.select()
                    .from(productModifiers)
                    .where(eq(productModifiers.productId, product.id));

                return {
                    ...product,
                    variants,
                    stores,
                    modifiers
                };
            })
        );

        res.json(productsWithDetails);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single product with its details
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const product = await db.select()
            .from(products)
            .where(eq(products.id, id))
            .then(rows => rows[0]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const variants = await db.select()
            .from(productVariants)
            .where(eq(productVariants.productId, id));

        const stores = await db.select()
            .from(productStores)
            .where(eq(productStores.productId, id));

        const modifiers = await db.select()
            .from(productModifiers)
            .where(eq(productModifiers.productId, id));

        res.json({
            ...product,
            variants,
            stores,
            modifiers
        });
    } catch (error) {
        console.error('Failed to fetch product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a product with variants, store links, and modifier links
router.post('/', async (req, res) => {
    try {
        const { product, variants = [], stores = [], modifiers = [] } = req.body;

        // Validate product data
        const productData = insertProductSchema.parse(product);

        // Start a transaction
        const newProduct = await db.transaction(async (tx) => {
            // Insert product
            const [createdProduct] = await tx.insert(products)
                .values(productData)
                .returning();

            // Insert variants if any
            if (variants.length > 0) {
                for (const variant of variants) {
                    await tx.insert(productVariants)
                        .values({
                            ...insertProductVariantSchema.parse(variant),
                            productId: createdProduct.id
                        });
                }
            }

            // Insert store links if any
            if (stores.length > 0) {
                for (const store of stores) {
                    await tx.insert(productStores)
                        .values({
                            ...insertProductStoreSchema.parse(store),
                            productId: createdProduct.id
                        });
                }
            }

            // Insert modifier links if any
            if (modifiers.length > 0) {
                for (const modifier of modifiers) {
                    await tx.insert(productModifiers)
                        .values({
                            ...insertProductModifierSchema.parse(modifier),
                            productId: createdProduct.id
                        });
                }
            }

            return createdProduct;
        });

        res.status(201).json(newProduct);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid data', details: error.errors });
        }
        console.error('Failed to create product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a product
router.patch('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = { ...req.body };

        // Handle numeric fields - convert empty strings to null
        if (updates.price === '') updates.price = null;
        if (updates.cost === '') updates.cost = null;
        if (updates.stockQuantity === '') updates.stockQuantity = null;

        // Set updated timestamp
        updates.updatedAt = new Date();

        const [updated] = await db.update(products)
            .set(updates)
            .where(eq(products.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Failed to update product:', error);
        const errorMessage = error instanceof Error ? error.message : 'unknown error';
        res.status(500).json({ error: `Failed to update product: ${errorMessage}` });
    }
});

// Delete a product and all related entities
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        await db.transaction(async (tx) => {
            // Delete all variants
            await tx.delete(productVariants)
                .where(eq(productVariants.productId, id));

            // Delete all store links
            await tx.delete(productStores)
                .where(eq(productStores.productId, id));

            // Delete all modifier links
            await tx.delete(productModifiers)
                .where(eq(productModifiers.productId, id));

            // Delete the product itself
            const result = await tx.delete(products)
                .where(eq(products.id, id))
                .returning({ deletedId: products.id });

            if (result.length === 0) {
                throw new Error('Product not found');
            }
        });

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        if (error instanceof Error && error.message === 'Product not found') {
            return res.status(404).json({ error: 'Product not found' });
        }
        console.error('Failed to delete product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add/Update product variant
router.post('/:id/variants', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const variantData = req.body;

        // Check if product exists
        const product = await db.select()
            .from(products)
            .where(eq(products.id, productId))
            .then(rows => rows[0]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const validatedData = insertProductVariantSchema.parse({
            ...variantData,
            productId
        });

        const [variant] = await db.insert(productVariants)
            .values(validatedData)
            .returning();

        res.status(201).json(variant);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid variant data', details: error.errors });
        }
        console.error('Failed to add product variant:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product variant
router.delete('/:productId/variants/:variantId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const variantId = parseInt(req.params.variantId);

        const result = await db.delete(productVariants)
            .where(
                and(
                    eq(productVariants.productId, productId),
                    eq(productVariants.id, variantId)
                )
            )
            .returning({ deletedId: productVariants.id });

        if (result.length === 0) {
            return res.status(404).json({ error: 'Variant not found' });
        }

        res.json({ message: 'Variant deleted successfully' });
    } catch (error) {
        console.error('Failed to delete product variant:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manage store availability
router.post('/:id/stores', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { storeId, isAvailable = true } = req.body;

        // Check if product exists
        const product = await db.select()
            .from(products)
            .where(eq(products.id, productId))
            .then(rows => rows[0]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if relationship already exists
        const existingLink = await db.select()
            .from(productStores)
            .where(
                and(
                    eq(productStores.productId, productId),
                    eq(productStores.storeId, storeId)
                )
            )
            .then(rows => rows[0]);

        if (existingLink) {
            // Update existing link
            const [updated] = await db.update(productStores)
                .set({ isAvailable, updatedAt: new Date() })
                .where(
                    and(
                        eq(productStores.productId, productId),
                        eq(productStores.storeId, storeId)
                    )
                )
                .returning();

            return res.json(updated);
        }

        // Create new link
        const [storeLink] = await db.insert(productStores)
            .values({
                productId,
                storeId,
                isAvailable
            })
            .returning();

        res.status(201).json(storeLink);
    } catch (error) {
        console.error('Failed to update product store link:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manage modifier links
router.post('/:id/modifiers', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { modifierId } = req.body;

        // Check if product exists
        const product = await db.select()
            .from(products)
            .where(eq(products.id, productId))
            .then(rows => rows[0]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if relationship already exists
        const existingLink = await db.select()
            .from(productModifiers)
            .where(
                and(
                    eq(productModifiers.productId, productId),
                    eq(productModifiers.modifierId, modifierId)
                )
            )
            .then(rows => rows[0]);

        if (existingLink) {
            return res.status(409).json({
                message: 'Modifier is already linked to this product',
                link: existingLink
            });
        }

        // Create new link
        const [modifierLink] = await db.insert(productModifiers)
            .values({
                productId,
                modifierId
            })
            .returning();

        res.status(201).json(modifierLink);
    } catch (error) {
        console.error('Failed to link modifier to product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove modifier link
router.delete('/:productId/modifiers/:modifierId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const modifierId = parseInt(req.params.modifierId);

        const result = await db.delete(productModifiers)
            .where(
                and(
                    eq(productModifiers.productId, productId),
                    eq(productModifiers.modifierId, modifierId)
                )
            )
            .returning({ deletedId: productModifiers.id });

        if (result.length === 0) {
            return res.status(404).json({ error: 'Modifier link not found' });
        }

        res.json({ message: 'Modifier unlinked successfully' });
    } catch (error) {
        console.error('Failed to unlink modifier from product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
