import { Router } from 'express';
import { db } from '../storage';
import { shifts, insertShiftSchema } from '../../shared/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { format } from 'date-fns';

const router = Router();

// Get all shifts with filtering
router.get('/', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;
        const isActive = req.query.isActive as string;

        // Build the query conditions
        const conditions = [];

        // Date range filter
        if (startDateStr || endDateStr) {
            const startDate = startDateStr ? new Date(startDateStr) : new Date(0);
            startDate.setHours(0, 0, 0, 0);

            const endDate = endDateStr ? new Date(endDateStr) : new Date();
            endDate.setHours(23, 59, 59, 999);

            conditions.push(and(
                gte(shifts.openingTime, startDate),
                lte(shifts.openingTime, endDate)
            ));
        }

        // Store filter
        if (store && store !== 'all') {
            conditions.push(eq(shifts.storeId, parseInt(store)));
        }

        // Employee filter
        if (employee && employee !== 'all') {
            conditions.push(eq(shifts.userId, parseInt(employee)));
        }

        // Active status filter
        if (isActive === 'true') {
            conditions.push(eq(shifts.isActive, true));
        } else if (isActive === 'false') {
            conditions.push(eq(shifts.isActive, false));
        }

        // Execute the query with all filters
        const result = await db.select()
            .from(shifts)
            .where(and(...conditions))
            .orderBy(desc(shifts.openingTime));

        res.json(result);
    } catch (error) {
        console.error('Failed to fetch shifts:', error);
        res.status(500).json({
            error: 'Failed to fetch shifts',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get shift reports data
router.get('/reports', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;

        // Set up date filtering
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        endDate.setHours(23, 59, 59, 999);

        console.log('Shifts report - Processing date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

        // Use SQL query for more control
        try {
            // Build the date where clause
            let dateWhereClause;
            if (startDateStr === endDateStr) {
                // If it's the same day, use direct DATE comparison
                dateWhereClause = sql`DATE(s.opening_time) = DATE(${startDate})`;
            } else {
                // For a date range, use between with truncated dates
                dateWhereClause = sql`DATE(s.opening_time) >= DATE(${startDate}) AND DATE(s.opening_time) <= DATE(${endDate})`;
            }

            // Build store filter
            const storeFilter = store !== 'all' ?
                sql`AND s.store_id = ${parseInt(store)}` :
                sql``;

            // Build employee filter
            const employeeFilter = employee !== 'all' ?
                sql`AND s.user_id = ${parseInt(employee)}` :
                sql``;

            // Execute the query
            const result = await db.execute(sql`
                SELECT
                    s.id,
                    s.store_id as "storeId",
                    st.name as "storeName",
                    s.user_id as "userId",
                    u.display_name as "userName",
                    s.opening_time as "openingTime",
                    s.closing_time as "closingTime",
                    s.expected_cash_amount as "expectedCashAmount",
                    s.actual_cash_amount as "actualCashAmount",
                    CASE
                        WHEN s.actual_cash_amount IS NOT NULL
                        THEN s.actual_cash_amount - s.expected_cash_amount
                        ELSE NULL
                    END as "difference",
                    s.is_active as "isActive",
                    s.notes
                FROM
                    shifts s
                LEFT JOIN
                    store_settings st ON s.store_id = st.id
                LEFT JOIN
                    users u ON s.user_id = u.id
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    ${employeeFilter}
                ORDER BY
                    s.opening_time DESC
            `);

            const report = {
                startDate,
                endDate,
                shifts: result.rows.map(shift => ({
                    ...shift,
                    openingTime: shift.openingTime && (typeof shift.openingTime === 'string' || typeof shift.openingTime === 'number' || shift.openingTime instanceof Date)
                        ? new Date(shift.openingTime)
                        : null,
                    closingTime: shift.closingTime && (typeof shift.closingTime === 'string' || typeof shift.closingTime === 'number' || shift.closingTime instanceof Date)
                        ? new Date(shift.closingTime)
                        : null,
                    expectedCashAmount: Number(shift.expectedCashAmount) || 0,
                    actualCashAmount: shift.actualCashAmount !== null ? Number(shift.actualCashAmount) : null,
                    difference: shift.difference !== null ? Number(shift.difference) : null
                }))
            };

            res.json(report);
        } catch (sqlError) {
            console.error('SQL error in shifts report:', sqlError);
            throw sqlError;
        }
    } catch (error) {
        console.error('Failed to generate shifts report:', error);
        res.status(500).json({
            error: 'Failed to generate shifts report',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get a single shift
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid shift ID' });
        }

        const result = await db.select()
            .from(shifts)
            .where(eq(shifts.id, id));

        if (result.length === 0) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        res.json(result[0]);
    } catch (error) {
        console.error(`Failed to fetch shift ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to fetch shift',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create a new shift
router.post('/', async (req, res) => {
    try {
        const shiftData = insertShiftSchema.parse(req.body);

        const [created] = await db.insert(shifts)
            .values({
                ...shiftData,
                expectedCashAmount: shiftData.expectedCashAmount?.toString(),
                actualCashAmount: shiftData.actualCashAmount?.toString(),
                openingTime: shiftData.openingTime || new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning();

        res.status(201).json(created);
    } catch (error) {
        console.error('Failed to create shift:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid shift data',
                details: error.errors
            });
        }

        res.status(500).json({
            error: 'Failed to create shift',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update a shift
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid shift ID' });
        }

        const shiftData = insertShiftSchema.partial().parse(req.body);

        const [updated] = await db.update(shifts)
            .set({
                ...shiftData,
                expectedCashAmount: shiftData.expectedCashAmount?.toString(),
                actualCashAmount: shiftData.actualCashAmount?.toString(),
                updatedAt: new Date()
            })
            .where(eq(shifts.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error(`Failed to update shift ${req.params.id}:`, error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid shift data',
                details: error.errors
            });
        }

        res.status(500).json({
            error: 'Failed to update shift',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// End a shift (special endpoint to close a shift)
router.post('/:id/end', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid shift ID' });
        }

        const { actualCashAmount, notes } = req.body;

        // Validate actual cash amount
        if (typeof actualCashAmount !== 'number' && actualCashAmount !== null) {
            return res.status(400).json({ error: 'Actual cash amount must be a number or null' });
        }

        const [shift] = await db.select()
            .from(shifts)
            .where(eq(shifts.id, id));

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        if (!shift.isActive) {
            return res.status(400).json({ error: 'Shift is already closed' });
        }

        const [updated] = await db.update(shifts)
            .set({
                closingTime: new Date(),
                actualCashAmount: actualCashAmount,
                notes: notes || shift.notes,
                isActive: false,
                updatedAt: new Date()
            })
            .where(eq(shifts.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error(`Failed to end shift ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to end shift',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete a shift
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid shift ID' });
        }

        const [deleted] = await db.delete(shifts)
            .where(eq(shifts.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        res.json({ success: true, message: 'Shift deleted successfully' });
    } catch (error) {
        console.error(`Failed to delete shift ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to delete shift',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
