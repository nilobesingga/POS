import { Router } from 'express';
import { db } from '../storage';
import { orders, orderItems, products } from '../../shared/schema';
import { and, gte, lte, sum, count, desc, sql, eq } from 'drizzle-orm';

const router = Router();

// Get sales report
router.get('/sales', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;

        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const endDate = endDateStr ? new Date(endDateStr) : new Date();

        // Get orders within date range
        const ordersInRange = await db.select({
            total: sum(orders.total),
            count: count(orders.id)
        })
            .from(orders)
            .where(
                and(
                    gte(orders.createdAt, startDate),
                    lte(orders.createdAt, endDate)
                )
            );

        // Get top products with proper date range filtering
        const topProducts = await db.select({
            productId: products.id,
            name: products.name,
            quantity: sum(orderItems.quantity),
            total: sql<number>`sum(${orderItems.quantity} * ${orderItems.price})`
        })
            .from(orders)
            .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
            .innerJoin(products, eq(products.id, orderItems.productId))
            .where(
                and(
                    gte(orders.createdAt, startDate),
                    lte(orders.createdAt, endDate)
                )
            )
            .groupBy(products.id, products.name)
            .orderBy(desc(sql<number>`sum(${orderItems.quantity} * ${orderItems.price})`))
            .limit(5);

        const report = {
            startDate,
            endDate,
            totalSales: ordersInRange[0]?.total || 0,
            orderCount: ordersInRange[0]?.count || 0,
            topProducts: topProducts.map(product => ({
                ...product,
                total: Number(product.total),
                quantity: Number(product.quantity)
            }))
        };

        res.json(report);
    } catch (error) {
        console.error('Failed to generate sales report:', error);
        res.status(500).json({ error: 'Failed to generate sales report' });
    }
});

export default router;
