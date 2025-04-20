import { Router } from 'express';
import { db } from '../storage';
import { orders, orderItems, products, users, paymentTypes } from '../../shared/schema';
import { and, gte, lte, sum, count, desc, sql, eq } from 'drizzle-orm';
import { format as dateFormat } from 'date-fns';

const router = Router();

// Utility function to safely stringify objects that might contain circular references
const safeStringify = (obj: any): string => {
    try {
        // Simple serializable objects can be directly stringified
        const str = JSON.stringify(obj);
        return str;
    } catch (error) {
        // If it contains circular references, return a simplified representation
        if (error instanceof Error && error.message.includes('circular')) {
            if (Array.isArray(obj)) {
                return `[Array with ${obj.length} items]`;
            } else if (obj && typeof obj === 'object') {
                return '{Complex object - cannot be stringified}';
            }
        }

        return String(obj);
    }
};

// Define interfaces for the expected data structures
interface StoreEntity {
    id: number;
    name: string;
}

interface UserEntity {
    id: number;
    name: string;
}

interface CustomerEntity {
    id: number;
    name: string;
}

interface DiscountEntity {
    id: number;
    name: string;
    discount_type?: string;
    value?: number;
}

interface TaxCategoryEntity {
    id: number;
    name: string;
    rate: number | null;
}

// Get sales report
router.get('/sales', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        // Convert Date objects to ISO strings for SQL queries
        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        // Enhanced Debug logging
        console.log('\n--------- SALES REPORT DEBUG ---------');
        console.log('Report query parameters:', {
            startDateStr,
            endDateStr,
            parsedStartDate: startDate.toISOString(),
            parsedEndDate: endDate.toISOString(),
            store,
            employee
        });

        // Check if there are any orders in the database regardless of filters
        const allOrdersCount = await db.select({ count: count() }).from(orders);
        console.log('Total orders in database:', allOrdersCount[0]?.count || 0);

        // Sample raw orders to check date format in DB
        const sampleOrders = await db.select({
            id: orders.id,
            total: orders.total,
            status: orders.status,
            createdAt: orders.createdAt,
            storeId: orders.storeId,
            userId: orders.userId
        })
            .from(orders)
            .limit(3);

        console.log('Sample orders from DB to check date format:', JSON.stringify(sampleOrders, null, 2));

        // Use SQL DATE() function for more reliable date matching
        let dateWhereClause;
        if (startDateStr === endDateStr) {
            // If it's the same day (like today), use direct DATE comparison
            dateWhereClause = sql`DATE(${orders.createdAt}) = DATE(${startDateISO})`;
            console.log('Using single date equality filter for:', dateFormat(startDate, 'yyyy-MM-dd'));
        } else {
            // For a date range, use between with truncated dates
            dateWhereClause = and(
                sql`DATE(${orders.createdAt}) >= DATE(${startDateISO})`,
                sql`DATE(${orders.createdAt}) <= DATE(${endDateISO})`
            );
            console.log('Using date range filter:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));
        }

        // Check orders matching date range only
        const dateFilteredOrders = await db.select({
            count: count(),
            minDate: sql`MIN(${orders.createdAt})`,
            maxDate: sql`MAX(${orders.createdAt})`
        })
            .from(orders)
            .where(dateWhereClause);

        console.log('Orders matching date range:', {
            count: dateFilteredOrders[0]?.count || 0,
            minDate: dateFilteredOrders[0]?.minDate,
            maxDate: dateFilteredOrders[0]?.maxDate
        });

        // Build the where clause based on filters
        const whereClause = and(
            dateWhereClause,
            ...(store !== 'all' ? [eq(orders.storeId, parseInt(store))] : []),
            ...(employee !== 'all' ? [eq(orders.userId, parseInt(employee))] : [])
        );

        // Debug log the generated whereClause structure
        console.log('Generated whereClause structure:');
        console.log('- Date condition:', dateWhereClause ? 'present' : 'missing');
        console.log('- Store filter:', store !== 'all' ? `storeId = ${store}` : 'all stores');
        console.log('- Employee filter:', employee !== 'all' ? `userId = ${employee}` : 'all employees');

        // Get sales summary with proper null handling and explicit casting
        const summary = await db.select({
            grossSales: sql`COALESCE(SUM(${orders.total}::numeric), 0)::numeric`,
            refunds: sql`COALESCE(SUM(CASE WHEN ${orders.status} = 'refunded' THEN ${orders.total}::numeric ELSE 0 END), 0)::numeric`,
            discounts: sql`COALESCE(SUM(${orders.discount}::numeric), 0)::numeric`,
            taxes: sql`COALESCE(SUM(${orders.tax}::numeric), 0)::numeric`,
            count: count(orders.id)
        })
            .from(orders)
            .where(whereClause);

        // Debug log the summary result
        console.log('Summary result:', JSON.stringify(summary[0], null, 2));

        // Check for raw orders that should be included in the calculation
        const relevantOrders = await db.select({
            id: orders.id,
            total: orders.total,
            status: orders.status,
            createdAt: orders.createdAt,
            storeId: orders.storeId,
            userId: orders.userId
        })
            .from(orders)
            .where(whereClause)
            .limit(10);

        // Safely log the orders
        console.log('Sample orders matching filters:', JSON.stringify(relevantOrders, null, 2));

        // Manually calculate the sum to verify SQL aggregation
        let manualTotal = 0;
        relevantOrders.forEach(order => {
            const orderTotal = typeof order.total === 'object' && order.total !== null && order.total !== undefined && 'value' in (order.total as any)
                ? parseFloat((order.total as any).value.toString())
                : parseFloat(order.total?.toString() || '0');

            manualTotal += !isNaN(orderTotal) ? orderTotal : 0;
        });

        console.log('Manually calculated total from sample:', manualTotal);

        // Check for any data type issues
        if (relevantOrders.length > 0) {
            console.log('First order total data type:', typeof relevantOrders[0].total);
            console.log('First order total value:', JSON.stringify(relevantOrders[0].total));
        }

        // Safely extract numeric values from summary
        const extractNumeric = (value: any): number => {
            // Handle null or undefined
            if (value === null || value === undefined) return 0;

            // Handle different data types from PostgreSQL
            if (typeof value === 'object') {
                // Handle PostgreSQL numeric type (returned as object with value property)
                if ('value' in value) {
                    const numValue = parseFloat(value.value.toString());
                    return !isNaN(numValue) ? numValue : 0;
                }

                // Handle special PostgreSQL types with nested structure
                if ('numerator' in value && 'denominator' in value) {
                    const num = parseFloat(value.numerator.toString());
                    const den = parseFloat(value.denominator.toString());
                    if (!isNaN(num) && !isNaN(den) && den !== 0) {
                        return num / den;
                    }
                    return 0;
                }

                // Return 0 for other object types we can't handle
                return 0;
            }

            // Handle primitive types
            const numValue = parseFloat(value.toString());
            return !isNaN(numValue) ? numValue : 0;
        };

        // Calculate net sales safely
        const grossSales = extractNumeric(summary[0]?.grossSales);
        const refunds = extractNumeric(summary[0]?.refunds);
        const discounts = extractNumeric(summary[0]?.discounts);
        const netSales = grossSales - refunds - discounts;

        // Calculate gross profit with proper null handling
        const profitCalc = await db.select({
            revenue: sql`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`,
            cost: sql`COALESCE(SUM(${orderItems.quantity} * ${products.cost}), 0)`
        })
            .from(orderItems)
            .innerJoin(orders, eq(orders.id, orderItems.orderId))
            .innerJoin(products, eq(products.id, orderItems.productId))
            .where(whereClause);

        const grossProfit = Number(profitCalc[0]?.revenue || 0) - Number(profitCalc[0]?.cost || 0);

        // Get daily sales data with proper null handling
        const dailySales = await db.select({
            date: sql<string>`DATE(${orders.createdAt})::text`,
            grossSales: sql`COALESCE(SUM(${orders.total}), 0)`,
            refunds: sql`COALESCE(SUM(CASE WHEN ${orders.status} = 'refunded' THEN ${orders.total} ELSE 0 END), 0)`,
            discounts: sql`COALESCE(SUM(${orders.discount}), 0)`,
            taxes: sql`COALESCE(SUM(${orders.tax}), 0)`
        })
            .from(orders)
            .where(whereClause)
            .groupBy(sql`DATE(${orders.createdAt})`)
            .orderBy(sql`DATE(${orders.createdAt})`);

        // Calculate trends data for each metric
        const trends = {
            grossSales: dailySales.map(day => ({
                date: dateFormat(new Date(day.date), 'MMM dd'),
                value: Number(day.grossSales)
            })),
            refunds: dailySales.map(day => ({
                date: dateFormat(new Date(day.date), 'MMM dd'),
                value: Number(day.refunds)
            })),
            discounts: dailySales.map(day => ({
                date: dateFormat(new Date(day.date), 'MMM dd'),
                value: Number(day.discounts)
            })),
            netSales: dailySales.map(day => ({
                date: dateFormat(new Date(day.date), 'MMM dd'),
                value: Number(day.grossSales) - Number(day.refunds) - Number(day.discounts)
            })),
            grossProfit: dailySales.map(day => ({
                date: dateFormat(new Date(day.date), 'MMM dd'),
                value: grossProfit / dailySales.length // Distribute profit evenly across days for trend
            }))
        };

        // Prepare daily sales data for the table
        const dailySalesForTable = dailySales.map(day => ({
            date: day.date,
            grossSales: Number(day.grossSales),
            refunds: Number(day.refunds),
            discounts: Number(day.discounts),
            netSales: Number(day.grossSales) - Number(day.refunds) - Number(day.discounts),
            taxes: Number(day.taxes)
        }));

        const report = {
            startDate,
            endDate,
            grossSales,
            refunds,
            discounts,
            netSales,
            grossProfit,
            orderCount: Number(summary[0]?.count || 0),
            trends,
            dailySales: dailySalesForTable
        };

        res.json(report);
    } catch (error) {
        console.error('Failed to generate sales report:', error);
        res.status(500).json({ error: 'Failed to generate sales report' });
    }
});

// Get receipts report
router.get('/receipts', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;
        const searchQuery = req.query.search as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        // Convert Date objects to ISO strings for SQL queries
        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        console.log('Receipts report - Processing date range:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));

        // Use direct SQL for more reliability instead of the Drizzle ORM builder
        try {
            const result = await db.execute(sql`
                SELECT
                    o.id,
                    o.order_number as "orderNumber",
                    o.created_at as "createdAt",
                    o.store_id as "storeId",
                    o.user_id as "userId",
                    o.customer_id as "customerId",
                    o.status,
                    o.total
                FROM
                    orders o
                WHERE
                    DATE(o.created_at) >= DATE(${startDateISO})
                    AND DATE(o.created_at) <= DATE(${endDateISO})
                    ${store !== 'all' ? sql`AND o.store_id = ${parseInt(store)}` : sql``}
                    ${employee !== 'all' ? sql`AND o.user_id = ${parseInt(employee)}` : sql``}
                ORDER BY
                    o.created_at DESC
            `);

            const ordersData = result.rows;
            console.log(`Found ${ordersData.length} order receipts`);

            // Extract unique IDs for related data
            const storeIds = Array.from(new Set(ordersData.map(order => order.storeId))).filter(Boolean);
            const userIds = Array.from(new Set(ordersData.map(order => order.userId))).filter(Boolean);
            const customerIds = Array.from(new Set(ordersData.map(order => order.customerId)))
                .filter(id => id !== null && id !== undefined);

            // Get store names
            let storeNames: StoreEntity[] = [];
            if (storeIds.length > 0) {
                try {
                    const storeResult = await db.execute(sql`
                        SELECT id, name FROM store_settings
                        WHERE id IN (${sql.join(storeIds.map(id => sql`${id}`), sql`, `)})
                    `);
                    storeNames = storeResult.rows.map(row => ({
                        id: Number(row.id),
                        name: String(row.name)
                    }));
                } catch (err) {
                    console.warn('Failed to fetch store names:', err);
                }
            }

            // Get employee names
            let employeeNames: UserEntity[] = [];
            if (userIds.length > 0) {
                try {
                    const userResult = await db.execute(sql`
                        SELECT id, display_name as name FROM users
                        WHERE id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})
                    `);
                    employeeNames = userResult.rows.map(row => ({
                        id: Number(row.id),
                        name: String(row.name)
                    }));
                } catch (err) {
                    console.warn('Failed to fetch employee names:', err);
                }
            }

            // Get customer names
            let customerNames: CustomerEntity[] = [];
            if (customerIds.length > 0) {
                try {
                    const customerResult = await db.execute(sql`
                            SELECT id, customer_name as name FROM customers
                            WHERE id IN (${sql.join(customerIds.map(id => sql`${id}`), sql`, `)})
                        `);
                    customerNames = customerResult.rows.map(row => ({
                        id: Number(row.id),
                        name: String(row.name)
                    }));
                } catch (err) {
                    console.warn('Failed to fetch customer names:', err);
                }
            }

            // Build lookup maps
            const storeMap = new Map(storeNames.map(store => [store.id, store.name]));
            const employeeMap = new Map(employeeNames.map(emp => [emp.id, emp.name]));
            const customerMap = new Map(customerNames.map(cust => [cust.id, cust.name]));

            // Process order data with lookups
            const receipts = ordersData.map(order => ({
                id: order.id,
                receiptNo: order.orderNumber || `R-${order.id}`, // Use orderNumber instead of receipt_no
                date: order.createdAt,
                storeId: order.storeId,
                storeName: storeMap.get(order.storeId) || `Store ${order.storeId}`,
                employeeId: order.userId,
                employeeName: employeeMap.get(order.userId) || `Employee ${order.userId}`,
                customerId: order.customerId,
                customerName: order.customerId ? customerMap.get(order.customerId) || 'Unknown Customer' : 'Walk-in Customer',
                type: order.status === 'refunded' ? 'Refund' : 'Sale',
                total: Number(order.total) || 0
            }));

            // Filter by search query if provided
            let filteredReceipts = receipts;
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                filteredReceipts = receipts.filter(receipt =>
                (receipt.receiptNo?.toString().toLowerCase().includes(searchLower) ||
                    (receipt.customerName && receipt.customerName.toLowerCase().includes(searchLower)) ||
                    (receipt.customerId && String(receipt.customerId).includes(searchLower)))
                );
            }

            // Calculate summary widgets
            const allReceipts = filteredReceipts.length;
            const sales = filteredReceipts.filter(r => r.type === 'Sale').length;
            const refunds = filteredReceipts.filter(r => r.type === 'Refund').length;

            // Format the response
            const report = {
                startDate,
                endDate,
                widgets: {
                    allReceipts,
                    sales,
                    refunds
                },
                receipts: filteredReceipts.map(receipt => ({
                    id: receipt.id,
                    receiptNo: receipt.receiptNo,
                    date: dateFormat(new Date(String(receipt.date)), "yyyy-MM-dd HH:mm:ss"),
                    storeId: receipt.storeId,
                    storeName: receipt.storeName,
                    employeeId: receipt.employeeId,
                    employeeName: receipt.employeeName,
                    customerId: receipt.customerId,
                    customerName: receipt.customerName,
                    type: receipt.type,
                    total: receipt.total
                }))
            };

            res.json(report);

        } catch (sqlError) {
            console.error('SQL error in receipts report:', sqlError);
            throw sqlError;  // Re-throw to be caught by the outer try-catch
        }

    } catch (error) {
        console.error('Failed to generate receipts report:', error);
        // Return empty structure on error instead of error response
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            widgets: {
                allReceipts: 0,
                sales: 0,
                refunds: 0
            },
            receipts: []
        });
    }
});

// Get tax report
router.get('/tax', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        // Convert Date objects to ISO strings for SQL queries
        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        console.log('Tax report - Processing date range:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));

        try {
            // Use direct SQL query to avoid Drizzle ORM issues
            const result = await db.execute(sql`
                SELECT
                    id,
                    tax,
                    subtotal,
                    total,
                    store_id as "storeId"
                FROM
                    orders
                WHERE
                    DATE(created_at) >= DATE(${startDateISO})
                    AND DATE(created_at) <= DATE(${endDateISO})
                    ${store !== 'all' ? sql`AND store_id = ${parseInt(store)}` : sql``}
                    ${employee !== 'all' ? sql`AND user_id = ${parseInt(employee)}` : sql``}
            `);

            const taxData = result.rows;
            console.log(`Found ${taxData.length} orders for tax report`);

            // Try to get tax categories from the database
            let taxCategories: TaxCategoryEntity[] = [];
            try {
                const taxCategoriesResult = await db.execute(sql`
                    SELECT
                        id,
                        name,
                        rate
                    FROM
                        tax_categories
                `);
                // Map the raw rows to properly typed TaxCategoryEntity objects
                taxCategories = taxCategoriesResult.rows.map(row => ({
                    id: Number(row.id),
                    name: String(row.name),
                    rate: row.rate !== undefined && row.rate !== null ? Number(row.rate) : null
                }));
                console.log(`Found ${taxCategories.length} tax categories`);
            } catch (error) {
                console.warn('Could not fetch tax categories:', error);
            }

            // Create a map of tax categories
            const taxCategoriesMap = new Map();

            // Add tax categories to the map
            taxCategories.forEach(cat => {
                taxCategoriesMap.set(Number(cat.id), {
                    name: cat.name,
                    rate: Number(cat.rate) || null,
                    taxableSales: 0,
                    taxAmount: 0
                });
            });

            // Default category if none exists
            if (taxCategoriesMap.size === 0) {
                taxCategoriesMap.set(1, {
                    name: 'Standard Tax',
                    rate: null,
                    taxableSales: 0,
                    taxAmount: 0
                });
            }

            // Calculate totals
            let taxableSales = 0;
            let nonTaxableSales = 0;
            let totalNetSales = 0;
            let totalTaxAmount = 0;

            taxData.forEach(order => {
                const tax = Number(order.tax) || 0;
                const subtotal = Number(order.subtotal) || 0;

                // Always use default category (id=1) since we don't have tax_category_id in the orders table
                const defaultCategoryId = 1;

                totalNetSales += subtotal;
                totalTaxAmount += tax;

                // If there's tax, add to taxable sales
                if (tax > 0) {
                    taxableSales += subtotal;

                    // Get or create tax category info
                    if (!taxCategoriesMap.has(defaultCategoryId)) {
                        taxCategoriesMap.set(defaultCategoryId, {
                            name: `Standard Tax`,
                            rate: null,
                            taxableSales: 0,
                            taxAmount: 0
                        });
                    }

                    const categoryInfo = taxCategoriesMap.get(defaultCategoryId);
                    categoryInfo.taxableSales += subtotal;
                    categoryInfo.taxAmount += tax;
                } else {
                    nonTaxableSales += subtotal;
                }
            });

            // Convert map to array for the response
            const processedTaxData = Array.from(taxCategoriesMap.entries())
                .filter(([_, info]) => info.taxAmount > 0) // Only include used tax categories
                .map(([id, info]) => ({
                    taxCategoryId: id,
                    taxName: info.name,
                    taxRate: info.rate,
                    taxableSales: info.taxableSales,
                    taxAmount: info.taxAmount
                }))
                .sort((a, b) => b.taxAmount - a.taxAmount);

            // If no tax categories were used but we have tax amount, create a default entry
            if (processedTaxData.length === 0 && totalTaxAmount > 0) {
                processedTaxData.push({
                    taxCategoryId: 1,
                    taxName: 'Standard Tax',
                    taxRate: null,
                    taxableSales: taxableSales,
                    taxAmount: totalTaxAmount
                });
            }

            // Format the response with widgets data
            const report = {
                startDate,
                endDate,
                widgets: {
                    taxableSales,
                    nonTaxableSales,
                    totalNetSales,
                    totalTaxAmount
                },
                taxData: processedTaxData
            };

            res.json(report);

        } catch (sqlError) {
            console.error('SQL error in tax report:', sqlError);
            throw sqlError;  // Re-throw to be caught by the outer try-catch
        }

    } catch (error) {
        console.error('Failed to generate tax report:', error);
        // If there's an error, return an empty report structure
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            widgets: {
                taxableSales: 0,
                nonTaxableSales: 0,
                totalNetSales: 0,
                totalTaxAmount: 0
            },
            taxData: []
        });
    }
});

// Get discounts report
router.get('/discounts', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        // Convert Date objects to ISO strings for SQL queries
        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        console.log('Discounts report - Processing date range:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));

        // Use direct SQL to avoid Drizzle ORM issues
        try {
            // Get orders with discounts
            const ordersResult = await db.execute(sql`
                SELECT
                    id,
                    discount,
                    total
                FROM
                    orders
                WHERE
                    DATE(created_at) >= DATE(${startDateISO})
                    AND DATE(created_at) <= DATE(${endDateISO})
                    ${store !== 'all' ? sql`AND store_id = ${parseInt(store)}` : sql``}
                    ${employee !== 'all' ? sql`AND user_id = ${parseInt(employee)}` : sql``}
            `);

            const ordersWithDiscounts = ordersResult.rows;
            console.log(`Found ${ordersWithDiscounts.length} orders in the selected date range`);

            // Get discount definitions from discounts table
            let discountDefinitions: DiscountEntity[] = [];
            try {
                const discountsResult = await db.execute(sql`
                    SELECT
                        id,
                        name,
                        type as discount_type,
                        value
                    FROM
                        discounts
                `);
                // Map the raw rows to properly typed DiscountEntity objects
                discountDefinitions = discountsResult.rows.map(row => ({
                    id: Number(row.id),
                    name: String(row.name),
                    discount_type: row.discount_type ? String(row.discount_type) : undefined,
                    value: row.value !== undefined && row.value !== null ? Number(row.value) : undefined
                }));
                console.log(`Found ${discountDefinitions.length} discount definitions`);
            } catch (error) {
                console.warn('Could not fetch discount definitions:', error);
                // Continue with empty definitions if table doesn't exist
            }

            // Create a single manual discount entry since we don't have discount_id association
            const discountsMap = new Map();
            discountsMap.set(0, {
                name: 'Manual Discount',
                count: 0,
                amount: 0
            });

            // Process orders and count discount usage
            ordersWithDiscounts.forEach(order => {
                const discountAmount = Number(order.discount) || 0;
                if (discountAmount > 0) {
                    const discountInfo = discountsMap.get(0);
                    discountInfo.count += 1;
                    discountInfo.amount += discountAmount;
                }
            });

            // Convert map to array of discount objects
            const discountsData = Array.from(discountsMap.entries())
                .filter(([_, info]) => info.count > 0) // Only include discounts that were used
                .map(([id, info]) => ({
                    discountId: Number(id),
                    discountName: info.name,
                    discountsApplied: info.count,
                    amountDiscounted: info.amount
                }))
                .sort((a, b) => b.amountDiscounted - a.amountDiscounted);

            // Calculate totals
            const totalDiscountsApplied = discountsData.reduce((sum, item) => sum + item.discountsApplied, 0);
            const totalAmountDiscounted = discountsData.reduce((sum, item) => sum + item.amountDiscounted, 0);

            console.log(`Prepared discount report with ${discountsData.length} discount types, total applied: ${totalDiscountsApplied}`);

            // Format the response
            const report = {
                startDate,
                endDate,
                discounts: discountsData,
                totalDiscountsApplied,
                totalAmountDiscounted
            };

            res.json(report);

        } catch (sqlError) {
            console.error('SQL error in discounts report:', sqlError);
            throw sqlError;  // Re-throw to be caught by the outer try-catch
        }

    } catch (error) {
        console.error('Failed to generate discounts report:', error);
        // Return empty structure on error
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            discounts: [],
            totalDiscountsApplied: 0,
            totalAmountDiscounted: 0
        });
    }
});

// Get sales by employee report
router.get('/employees', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        console.log('Employee sales report - Processing date range:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));

        try {
            // First build the date where clause for consistent usage
            let dateWhereClause;
            if (startDateStr === endDateStr) {
                // If it's the same day, use direct DATE comparison
                dateWhereClause = sql`DATE(o.created_at) = DATE(${startDate})`;
            } else {
                // For a date range, use between with truncated dates
                dateWhereClause = sql`DATE(o.created_at) >= DATE(${startDate}) AND DATE(o.created_at) <= DATE(${endDate})`;
            }

            // Build store filter
            const storeFilter = store !== 'all' ?
                sql`AND o.store_id = ${!isNaN(parseInt(store)) ? parseInt(store) : 0}` :
                sql``;

            // Get employee sales data
            const result = await db.execute(sql`
                SELECT
                    u.id,
                    u.display_name as "name",
                    u.email,
                    COALESCE(SUM(o.total), 0) as "grossSales",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN o.total ELSE 0 END), 0) as "refunds",
                    COALESCE(SUM(o.discount), 0) as "discounts",
                    COUNT(DISTINCT o.id) as "receipts",
                    0 as "customersSignedUp"
                FROM
                    users u
                LEFT JOIN
                    orders o ON u.id = o.user_id AND ${dateWhereClause} ${storeFilter}
                GROUP BY
                    u.id, u.display_name, u.email
                ORDER BY
                    "grossSales" DESC
            `);

            const employeeSalesData = result.rows;
            console.log(`Found sales data for ${employeeSalesData.length} employees`);

            // Process the employee data
            const employeeData = employeeSalesData.map(employee => {
                const grossSales = Number(employee.grossSales) || 0;
                const refunds = Number(employee.refunds) || 0;
                const discounts = Number(employee.discounts) || 0;
                const netSales = grossSales - refunds - discounts;
                const receipts = Number(employee.receipts) || 0;
                const avgSale = receipts > 0 ? netSales / receipts : 0;

                return {
                    id: Number(employee.id),
                    name: employee.name || 'Unknown Employee',
                    email: employee.email || '',
                    grossSales,
                    refunds,
                    discounts,
                    netSales,
                    receipts,
                    avgSale,
                    customersSignedUp: Number(employee.customersSignedUp) || 0
                };
            });

            // Filter out employees with no sales or activity
            const activeEmployees = employeeData.filter(emp => emp.grossSales > 0);

            // Get top 5 employees by net sales
            const top5Employees = [...activeEmployees]
                .sort((a, b) => b.netSales - a.netSales)
                .slice(0, 5);

            // Get daily sales by top 5 employees for the time series
            const employeeIds = top5Employees.map(emp => emp.id);
            const dailySalesResult = await db.execute(sql`
                SELECT
                    DATE(o.created_at) as "date",
                    o.user_id as "employeeId",
                    u.display_name as "employeeName",
                    COALESCE(SUM(o.total), 0) as "grossSales",
                    COUNT(DISTINCT o.id) as "receipts"
                FROM
                    orders o
                JOIN
                    users u ON o.user_id = u.id
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    AND o.user_id IN (${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)})
                GROUP BY
                    DATE(o.created_at), o.user_id, u.display_name
                ORDER BY
                    DATE(o.created_at)
            `);

            // Process daily sales data for each employee
            const dailySales = dailySalesResult.rows.map(row => ({
                date: dateFormat(new Date(String(row.date)), 'MMM dd'),
                employeeId: Number(row.employeeId),
                name: String(row.employeeName),
                grossSales: Number(row.grossSales) || 0,
                receipts: Number(row.receipts) || 0
            }));

            // Create time series data structure for each employee
            const timeSeriesData = top5Employees.map(employee => {
                // Find daily data points for this employee
                const employeeDailyData = dailySales
                    .filter(day => day.employeeId === employee.id)
                    .map(day => ({
                        date: day.date,
                        grossSales: day.grossSales,
                        receipts: day.receipts,
                        name: day.name
                    }));

                return {
                    id: employee.id,
                    name: employee.name,
                    data: employeeDailyData
                };
            });

            // Calculate total sales for the entire period
            const totalGrossSales = activeEmployees.reduce((sum, emp) => sum + emp.grossSales, 0);
            const totalNetSales = activeEmployees.reduce((sum, emp) => sum + emp.netSales, 0);

            // Format the response to match frontend expectations
            const report = {
                startDate,
                endDate,
                employees: activeEmployees,
                top5Employees,
                timeSeriesData,
                totalGrossSales,
                totalNetSales
            };

            res.json(report);

        } catch (sqlError) {
            console.error('SQL error in employee sales report:', sqlError);
            throw sqlError;
        }

    } catch (error) {
        console.error('Failed to generate employee sales report:', error);
        // Return an empty report structure instead of an error
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            employees: [],
            top5Employees: [],
            timeSeriesData: [],
            totalGrossSales: 0,
            totalNetSales: 0
        });
    }
});

// Get sales by category report
router.get('/sales-by-category', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const storeId = req.query.storeId as string;
        const employee = req.query.employee as string || 'all'; // Default to 'all' if undefined

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        // Enhanced debug logging
        console.log('\n--------- SALES BY CATEGORY DEBUG ---------');
        console.log('Report query parameters:', {
            startDateStr,
            endDateStr,
            parsedStartDate: startDate.toISOString(),
            parsedEndDate: endDate.toISOString(),
            storeId,
            employee
        });

        // Check if there are any orders in the database regardless of filters
        const allOrdersCount = await db.select({ count: count() }).from(orders);
        console.log('Total orders in database:', allOrdersCount[0]?.count || 0);

        // Check for orders in the specific date range
        const dateRangeOrdersCount = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM orders
            WHERE DATE(created_at) >= DATE(${startDate})
            AND DATE(created_at) <= DATE(${endDate})
        `);
        console.log('Orders in date range:', dateRangeOrdersCount.rows[0]?.count || 0);

        // Sample raw orders to check date format in DB
        const sampleOrders = await db.select({
            id: orders.id,
            total: orders.total,
            status: orders.status,
            createdAt: orders.createdAt,
            storeId: orders.storeId,
            userId: orders.userId
        })
            .from(orders)
            .limit(3);

        console.log('Sample orders from DB to check date format:', JSON.stringify(sampleOrders, null, 2));

        // Use direct SQL for more reliable date handling
        try {
            // First build the date where clause for consistent usage
            let dateWhereClause;
            if (startDateStr === endDateStr) {
                // If it's the same day, use direct DATE comparison
                dateWhereClause = sql`DATE(o.created_at) = DATE(${startDate})`;
            } else {
                // For a date range, use between with truncated dates
                dateWhereClause = sql`DATE(o.created_at) >= DATE(${startDate}) AND DATE(o.created_at) <= DATE(${endDate})`;
            }

            // Debug log the exact SQL date filter we're using
            console.log('Date filter logic:',
                startDateStr === endDateStr ?
                    `DATE(o.created_at) = DATE('${dateFormat(startDate, 'yyyy-MM-dd')}')` :
                    `DATE(o.created_at) >= DATE('${dateFormat(startDate, 'yyyy-MM-dd')}') AND DATE(o.created_at) <= DATE('${dateFormat(endDate, 'yyyy-MM-dd')}')`
            );

            // Build store and employee filters
            const storeFilter = storeId !== 'all' ?
                sql`AND o.store_id = ${!isNaN(parseInt(storeId)) ? parseInt(storeId) : 0}` :
                sql``;
            const employeeFilter = employee !== 'all' ?
                sql`AND o.user_id = ${!isNaN(parseInt(employee)) ? parseInt(employee) : 0}` :
                sql``;

            // Debug log the filter parameters
            console.log('Store filter:', storeId !== 'all' ? `storeId = ${storeId}` : 'all stores');
            console.log('Employee filter:', employee !== 'all' ? `userId = ${employee}` : 'all employees');

            // Check orders with just date filter to isolate filter issues
            const dateFilteredOrders = await db.execute(sql`
                SELECT COUNT(*) as count
                FROM orders o
                WHERE ${dateWhereClause}
            `);
            console.log('Orders with date filter only:', dateFilteredOrders.rows[0]?.count || 0);

            // Check orders with date and store filter
            const dateAndStoreFilteredOrders = await db.execute(sql`
                SELECT COUNT(*) as count
                FROM orders o
                WHERE ${dateWhereClause}
                ${storeFilter}
            `);
            console.log('Orders with date and store filter:', dateAndStoreFilteredOrders.rows[0]?.count || 0);

            // Check orders with all filters
            const allFiltersOrders = await db.execute(sql`
                SELECT COUNT(*) as count
                FROM orders o
                WHERE ${dateWhereClause}
                ${storeFilter}
                ${employeeFilter}
            `);
            console.log('Orders with all filters:', allFiltersOrders.rows[0]?.count || 0);

            // Check order_items join integrity
            const orderItemsJoin = await db.execute(sql`
                SELECT COUNT(*) as count
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                WHERE ${dateWhereClause}
                ${storeFilter}
                ${employeeFilter}
            `);
            console.log('Orders with order_items join:', orderItemsJoin.rows[0]?.count || 0);

            // Check product join integrity
            const productJoin = await db.execute(sql`
                SELECT COUNT(*) as count
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                WHERE ${dateWhereClause}
                ${storeFilter}
                ${employeeFilter}
            `);
            console.log('Orders with product join:', productJoin.rows[0]?.count || 0);

            // Check category join integrity
            const categoryJoin = await db.execute(sql`
                SELECT COUNT(*) as count
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE ${dateWhereClause}
                ${storeFilter}
                ${employeeFilter}
            `);
            console.log('Orders with category join:', categoryJoin.rows[0]?.count || 0);

            // Get sales data grouped by category
            const result = await db.execute(sql`
                SELECT
                    c.id as "categoryId",
                    c.name as "categoryName",
                    COALESCE(SUM(oi.quantity), 0) as "quantity",
                    COALESCE(SUM(oi.quantity * oi.price), 0) as "grossSales",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN oi.quantity ELSE 0 END), 0) as "quantityRefunded",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN oi.quantity * oi.price ELSE 0 END), 0) as "refundAmount",
                    COUNT(DISTINCT o.id) as "orderCount"
                FROM
                    order_items oi
                JOIN
                    orders o ON oi.order_id = o.id
                JOIN
                    products p ON oi.product_id = p.id
                LEFT JOIN
                    categories c ON p.category_id = c.id
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    ${employeeFilter}
                GROUP BY
                    c.id, c.name
                ORDER BY
                    "grossSales" DESC
            `);

            const categorySalesData = result.rows;
            console.log(`Found ${categorySalesData.length} categories with sales`);
            if (categorySalesData.length > 0) {
                console.log('First category sample:', JSON.stringify(categorySalesData[0], null, 2));
            } else {
                // If we have orders but no categories, check if there's order items data at all
                const orderItemsData = await db.execute(sql`
                    SELECT COUNT(*) as count
                    FROM order_items
                    WHERE order_id IN (
                        SELECT id FROM orders
                        WHERE ${dateWhereClause}
                        ${storeFilter}
                        ${employeeFilter}
                    )
                `);
                console.log('Order items for selected orders:', orderItemsData.rows[0]?.count || 0);
            }

            // Calculate net sales (gross sales minus refunds)
            const processedData = categorySalesData.map((category: any) => {
                const grossSales = Number(category.grossSales) || 0;
                const refundAmount = Number(category.refundAmount) || 0;
                const netSales = grossSales - refundAmount;

                return {
                    categoryId: category.categoryId || 0, // Use 0 for uncategorized
                    categoryName: category.categoryName || 'Uncategorized',
                    quantity: Number(category.quantity) || 0,
                    grossSales,
                    quantityRefunded: Number(category.quantityRefunded) || 0,
                    refundAmount,
                    netSales,
                    orderCount: Number(category.orderCount) || 0
                };
            });

            // Calculate total values for summary
            const totalQuantity = processedData.reduce((sum, item) => sum + item.quantity, 0);
            const totalGrossSales = processedData.reduce((sum, item) => sum + item.grossSales, 0);
            const totalRefundAmount = processedData.reduce((sum, item) => sum + item.refundAmount, 0);
            const totalNetSales = processedData.reduce((sum, item) => sum + item.netSales, 0);

            // Log the summary totals for validation
            console.log('Summary totals:', { totalQuantity, totalGrossSales, totalRefundAmount, totalNetSales });

            // Prepare the daily trend data (sales per category per day)
            const dailyTrendsResult = await db.execute(sql`
                SELECT
                    DATE(o.created_at) as "date",
                    c.id as "categoryId",
                    c.name as "categoryName",
                    COALESCE(SUM(oi.quantity * oi.price), 0) as "grossSales"
                FROM
                    order_items oi
                JOIN
                    orders o ON oi.order_id = o.id
                JOIN
                    products p ON oi.product_id = p.id
                LEFT JOIN
                    categories c ON p.category_id = c.id
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    ${employeeFilter}
                GROUP BY
                    DATE(o.created_at), c.id, c.name
                ORDER BY
                    DATE(o.created_at), "grossSales" DESC
            `);

            // Log daily trends result size
            console.log(`Found ${dailyTrendsResult.rows.length} daily trend records`);

            // Process daily trends data for the chart
            const dailyTrends = dailyTrendsResult.rows.map(row => ({
                date: dateFormat(new Date(String(row.date)), 'MMM dd'),
                categoryId: row.categoryId || 0,
                categoryName: row.categoryName || 'Uncategorized',
                sales: Number(row.grossSales) || 0
            }));

            // Group daily trends by category for time series chart
            const timeSeriesData = processedData.map((category: any) => {
                const categoryTrends = dailyTrends
                    .filter(trend => trend.categoryId === category.categoryId)
                    .map(trend => ({
                        date: trend.date,
                        sales: trend.sales
                    }));

                return {
                    id: category.categoryId,
                    name: category.categoryName,
                    data: categoryTrends
                };
            });

            // Calculate total values for summary
            const totalValues = {
                totalQuantity,
                totalGrossSales,
                totalRefundAmount,
                totalNetSales
            };

            // Format the response
            const report = {
                startDate,
                endDate,
                summary: totalValues,
                categories: processedData,
                timeSeriesData
            };

            // Log the final response size
            console.log('Response data:', {
                categoriesCount: processedData.length,
                timeSeriesCount: timeSeriesData.length
            });

            res.json(report);

        } catch (sqlError) {
            console.error('SQL error in sales by category report:', sqlError);
            throw sqlError;
        }
    } catch (error) {
        console.error('Failed to generate sales by category report:', error);
        // Return an empty report structure instead of an error
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            summary: {
                totalQuantity: 0,
                totalGrossSales: 0,
                totalRefundAmount: 0,
                totalNetSales: 0
            },
            categories: [],
            timeSeriesData: []
        });
    }
});

// Get items report
router.get('/items', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;
        const searchQuery = req.query.search as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        console.log('Items report - Processing date range:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));

        // Use direct SQL for more reliable date handling
        try {
            // First build the date where clause for consistent usage
            let dateWhereClause;
            if (startDateStr === endDateStr) {
                // If it's the same day, use direct DATE comparison
                dateWhereClause = sql`DATE(o.created_at) = DATE(${startDate})`;
            } else {
                // For a date range, use between with truncated dates
                dateWhereClause = sql`DATE(o.created_at) >= DATE(${startDate}) AND DATE(o.created_at) <= DATE(${endDate})`;
            }

            // Build store and employee filters
            const storeFilter = store !== 'all' ?
                sql`AND o.store_id = ${!isNaN(parseInt(store)) ? parseInt(store) : 0}` :
                sql``;
            const employeeFilter = employee !== 'all' ?
                sql`AND o.user_id = ${!isNaN(parseInt(employee)) ? parseInt(employee) : 0}` :
                sql``;

            // Get sales data grouped by product
            const result = await db.execute(sql`
                SELECT
                    p.id as "productId",
                    p.name as "productName",
                    p.sku,
                    c.id as "categoryId",
                    c.name as "categoryName",
                    COALESCE(SUM(oi.quantity), 0) as "quantity",
                    COALESCE(AVG(oi.price), 0) as "avgPrice",
                    p.cost as "cost",
                    COALESCE(SUM(oi.quantity * oi.price), 0) as "grossSales",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN oi.quantity ELSE 0 END), 0) as "quantityRefunded",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN oi.quantity * oi.price ELSE 0 END), 0) as "refundAmount",
                    COALESCE(SUM(o.discount * (oi.quantity * oi.price / o.subtotal)), 0) as "discounts",
                    COALESCE(SUM(o.tax * (oi.quantity * oi.price / o.subtotal)), 0) as "taxes",
                    COUNT(DISTINCT o.id) as "orderCount"
                FROM
                    order_items oi
                JOIN
                    orders o ON oi.order_id = o.id
                JOIN
                    products p ON oi.product_id = p.id
                LEFT JOIN
                    categories c ON p.category_id = c.id
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    ${employeeFilter}
                GROUP BY
                    p.id, p.name, p.sku, p.cost, c.id, c.name
                ORDER BY
                    "grossSales" DESC
            `);

            const itemSalesData = result.rows;
            console.log(`Found ${itemSalesData.length} products with sales`);

            // Calculate net sales and profit for each item - match frontend expected structure
            const processedData = itemSalesData.map(item => {
                const grossSales = Number(item.grossSales) || 0;
                const refundAmount = Number(item.refundAmount) || 0;
                const discounts = Number(item.discounts) || 0;
                const netSales = grossSales - refundAmount - discounts;
                const quantity = Number(item.quantity) || 0;
                const quantityRefunded = Number(item.quantityRefunded) || 0;
                const taxes = Number(item.taxes) || 0;
                const cost = Number(item.cost) || 0;
                const netQuantity = quantity - quantityRefunded;
                const totalCost = cost * netQuantity;
                const grossProfit = netSales - totalCost;
                const margin = netSales > 0 ? grossProfit / netSales : 0;

                return {
                    id: item.productId,
                    name: item.productName || 'Unknown Product',
                    sku: item.sku || '',
                    categoryId: item.categoryId || 0,
                    categoryName: item.categoryName || 'Uncategorized',
                    quantity: quantity,
                    itemsRefunded: quantityRefunded,
                    grossSales: grossSales,
                    refunds: refundAmount,
                    discounts: discounts,
                    netSales: netSales,
                    taxes: taxes,
                    cost: totalCost,
                    grossProfit: grossProfit,
                    margin: margin,
                    orderCount: Number(item.orderCount) || 0
                };
            });

            // Apply search filter if provided
            let filteredData = processedData;
            if (searchQuery && searchQuery.trim() !== '') {
                const search = searchQuery.toLowerCase().trim();
                filteredData = processedData.filter(item =>
                    item.name.toLowerCase().includes(search) ||
                    item.sku.toLowerCase().includes(search) ||
                    item.categoryName.toLowerCase().includes(search)
                );
            }

            // Calculate summary data
            const totalGrossSales = filteredData.reduce((sum, item) => sum + item.grossSales, 0);
            const totalRefundAmount = filteredData.reduce((sum, item) => sum + item.refunds, 0);
            const totalDiscounts = filteredData.reduce((sum, item) => sum + item.discounts, 0);
            const totalNetSales = filteredData.reduce((sum, item) => sum + item.netSales, 0);
            const totalQuantity = filteredData.reduce((sum, item) => sum + item.quantity, 0);
            const totalQuantityRefunded = filteredData.reduce((sum, item) => sum + item.itemsRefunded, 0);
            const totalCost = filteredData.reduce((sum, item) => sum + item.cost, 0);
            const totalProfit = filteredData.reduce((sum, item) => sum + item.grossProfit, 0);
            const totalTaxes = filteredData.reduce((sum, item) => sum + item.taxes, 0);
            const averageProfitMargin = totalNetSales > 0 ? (totalProfit / totalNetSales) : 0;

            // Prepare top 5 items list for widget
            const top5Items = filteredData
                .sort((a, b) => b.netSales - a.netSales)
                .slice(0, 5)
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    categoryName: item.categoryName,
                    quantity: item.quantity - item.itemsRefunded,
                    netSales: item.netSales
                }));

            // Prepare daily trends data for chart visualization
            const dailyTrendsResult = await db.execute(sql`
                SELECT
                    DATE(o.created_at) as "date",
                    p.id as "productId",
                    p.name as "productName",
                    COALESCE(SUM(oi.quantity), 0) as "quantity",
                    COALESCE(SUM(oi.quantity * oi.price), 0) as "sales"
                FROM
                    order_items oi
                JOIN
                    orders o ON oi.order_id = o.id
                JOIN
                    products p ON oi.product_id = p.id
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    ${employeeFilter}
                    AND p.id IN (${sql.join(
                top5Items.map(item => sql`${item.id}`),
                sql`, `
            )})
                GROUP BY
                    DATE(o.created_at), p.id, p.name
                ORDER BY
                    DATE(o.created_at)
            `);

            // Process daily trends data into time series format expected by the frontend
            const dailyTrends = dailyTrendsResult.rows.map(row => ({
                date: dateFormat(new Date(String(row.date)), 'MMM dd'),
                productId: row.productId,
                productName: row.productName,
                quantity: Number(row.quantity) || 0,
                sales: Number(row.sales) || 0,
                name: row.productName
            }));

            // Transform into the structure expected by the line/bar chart
            const timeSeriesData = top5Items.map(topItem => {
                const itemDailyData = dailyTrends
                    .filter(trend => trend.productId === topItem.id)
                    .map(trend => ({
                        date: trend.date,
                        quantity: trend.quantity,
                        sales: trend.sales,
                        name: trend.name
                    }));

                return {
                    id: topItem.id,
                    name: topItem.name,
                    data: itemDailyData
                };
            });

            // Format response to match the frontend expectations
            const report = {
                startDate,
                endDate,
                summary: {
                    totalItems: filteredData.length,
                    totalGrossSales,
                    totalRefundAmount,
                    totalDiscounts,
                    totalNetSales,
                    totalQuantity,
                    totalQuantityRefunded,
                    totalCost,
                    totalProfit,
                    totalTaxes,
                    averageProfitMargin
                },
                items: filteredData,
                top5Items,
                timeSeriesData,
                dailyTrends
            };

            res.json(report);
        } catch (sqlError) {
            console.error('SQL error in items report:', sqlError);
            throw sqlError;
        }
    } catch (error) {
        console.error('Failed to generate items report:', error);
        // Return an empty report structure instead of an error
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            summary: {
                totalItems: 0,
                totalGrossSales: 0,
                totalRefundAmount: 0,
                totalDiscounts: 0,
                totalNetSales: 0,
                totalQuantity: 0,
                totalQuantityRefunded: 0,
                totalCost: 0,
                totalProfit: 0,
                totalTaxes: 0,
                averageProfitMargin: 0
            },
            items: [],
            top5Items: [],
            timeSeriesData: [],
            dailyTrends: []
        });
    }
});

// Get payment-types report
router.get('/payment-types', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        console.log('Payment types report - Processing date range:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));

        try {
            // First build the date where clause for consistent usage
            let dateWhereClause;
            if (startDateStr === endDateStr) {
                // If it's the same day, use direct DATE comparison
                dateWhereClause = sql`DATE(o.created_at) = DATE(${startDate})`;
            } else {
                // For a date range, use between with truncated dates
                dateWhereClause = sql`DATE(o.created_at) >= DATE(${startDate}) AND DATE(o.created_at) <= DATE(${endDate})`;
            }

            // Build store and employee filters
            const storeFilter = store !== 'all' ?
                sql`AND o.store_id = ${!isNaN(parseInt(store)) ? parseInt(store) : 0}` :
                sql``;
            const employeeFilter = employee !== 'all' ?
                sql`AND o.user_id = ${!isNaN(parseInt(employee)) ? parseInt(employee) : 0}` :
                sql``;

            // Get sales data grouped by payment method
            const result = await db.execute(sql`
                SELECT
                    o.payment_method as "paymentMethod",
                    COUNT(*) as "transactionCount",
                    COALESCE(SUM(CASE WHEN o.status != 'refunded' THEN o.total ELSE 0 END), 0) as "paymentAmount",
                    COUNT(CASE WHEN o.status = 'refunded' THEN 1 END) as "refundTransactionCount",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN o.total ELSE 0 END), 0) as "refundAmount"
                FROM
                    orders o
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    ${employeeFilter}
                GROUP BY
                    o.payment_method
                ORDER BY
                    "paymentAmount" DESC
            `);

            // Check if we have payment types defined in database
            let paymentTypeDefinitions: { id: number; name: string; code: string }[] = [];
            try {
                const paymentTypesResult = await db.execute(sql`
                    SELECT
                        id,
                        name,
                        code
                    FROM
                        payment_types
                `);

                paymentTypeDefinitions = paymentTypesResult.rows.map(row => ({
                    id: Number(row.id),
                    name: String(row.name),
                    code: String(row.code)
                }));
                console.log(`Found ${paymentTypeDefinitions.length} payment type definitions`);
            } catch (error) {
                console.warn('Could not fetch payment type definitions:', error);
            }

            // Create a map of payment type code to name
            const paymentTypeMap = new Map();
            paymentTypeDefinitions.forEach(pt => {
                paymentTypeMap.set(pt.code.toLowerCase(), {
                    id: pt.id,
                    name: pt.name,
                });
            });

            // Process payment method data
            const paymentData = result.rows.map(row => {
                const paymentMethod = String(row.paymentMethod || '').toLowerCase();
                const paymentType = paymentTypeMap.get(paymentMethod);
                const paymentAmount = Number(row.paymentAmount) || 0;
                const refundAmount = Number(row.refundAmount) || 0;
                const netAmount = paymentAmount - refundAmount;

                return {
                    paymentTypeId: paymentType?.id || 0,
                    paymentTypeName: paymentType?.name || row.paymentMethod || 'Other',
                    transactionCount: Number(row.transactionCount) || 0,
                    paymentAmount: paymentAmount,
                    refundTransactionCount: Number(row.refundTransactionCount) || 0,
                    refundAmount: refundAmount,
                    netAmount: netAmount
                };
            });

            // Calculate totals
            const totalPaymentAmount = paymentData.reduce((sum, item) => sum + item.paymentAmount, 0);
            const totalRefundAmount = paymentData.reduce((sum, item) => sum + item.refundAmount, 0);
            const totalNetAmount = paymentData.reduce((sum, item) => sum + item.netAmount, 0);

            // Format the response
            const report = {
                startDate,
                endDate,
                paymentTypes: paymentData,
                totalPaymentAmount,
                totalRefundAmount,
                totalNetAmount
            };

            res.json(report);

        } catch (sqlError) {
            console.error('SQL error in payment types report:', sqlError);
            throw sqlError;
        }
    } catch (error) {
        console.error('Failed to generate payment types report:', error);
        // Return an empty report structure instead of an error
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            paymentTypes: [],
            totalPaymentAmount: 0,
            totalRefundAmount: 0,
            totalNetAmount: 0
        });
    }
});

// Get modifiers report
router.get('/modifiers', async (req, res) => {
    try {
        const startDateStr = req.query.startDate as string;
        const endDateStr = req.query.endDate as string;
        const store = req.query.store as string;
        const employee = req.query.employee as string;

        // More precise date handling to include all records for the day
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Set start time to beginning of day (00:00:00.000)
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Set end time to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);

        console.log('Modifiers report - Processing date range:', dateFormat(startDate, 'yyyy-MM-dd'), 'to', dateFormat(endDate, 'yyyy-MM-dd'));

        try {
            // First build the date where clause for consistent usage
            let dateWhereClause;
            if (startDateStr === endDateStr) {
                // If it's the same day, use direct DATE comparison
                dateWhereClause = sql`DATE(o.created_at) = DATE(${startDate})`;
            } else {
                // For a date range, use between with truncated dates
                dateWhereClause = sql`DATE(o.created_at) >= DATE(${startDate}) AND DATE(o.created_at) <= DATE(${endDate})`;
            }

            // Build store and employee filters
            const storeFilter = store !== 'all' ?
                sql`AND o.store_id = ${!isNaN(parseInt(store)) ? parseInt(store) : 0}` :
                sql``;
            const employeeFilter = employee !== 'all' ?
                sql`AND o.user_id = ${!isNaN(parseInt(employee)) ? parseInt(employee) : 0}` :
                sql``;

            // Get sales data grouped by modifier
            const result = await db.execute(sql`
                SELECT
                    m.id as "modifierId",
                    m.name as "modifierName",
                    COALESCE(SUM(oim.quantity), 0) as "quantitySold",
                    COALESCE(SUM(oim.quantity * oim.price), 0) as "grossSales",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN oim.quantity ELSE 0 END), 0) as "quantityRefunded",
                    COALESCE(SUM(CASE WHEN o.status = 'refunded' THEN oim.quantity * oim.price ELSE 0 END), 0) as "refundAmount"
                FROM
                    order_item_modifiers oim
                JOIN
                    order_items oi ON oim.order_item_id = oi.id
                JOIN
                    orders o ON oi.order_id = o.id
                JOIN
                    modifiers m ON oim.modifier_id = m.id
                WHERE
                    ${dateWhereClause}
                    ${storeFilter}
                    ${employeeFilter}
                GROUP BY
                    m.id, m.name
                ORDER BY
                    "grossSales" DESC
            `);

            const modifierSalesData = result.rows;
            console.log(`Found ${modifierSalesData.length} modifiers with sales`);

            // Process the data and calculate net sales
            const processedData = modifierSalesData.map(modifier => {
                const grossSales = Number(modifier.grossSales) || 0;
                const refundAmount = Number(modifier.refundAmount) || 0;
                const netSales = grossSales - refundAmount;

                return {
                    modifierId: Number(modifier.modifierId),
                    modifierName: String(modifier.modifierName || 'Unknown Modifier'),
                    quantitySold: Number(modifier.quantitySold) || 0,
                    grossSales,
                    quantityRefunded: Number(modifier.quantityRefunded) || 0,
                    refundAmount,
                    netSales
                };
            });

            // Format the response to match the frontend expectations
            const report = {
                startDate,
                endDate,
                modifiers: processedData
            };

            res.json(report);

        } catch (sqlError) {
            console.error('SQL error in modifiers report:', sqlError);
            throw sqlError;
        }
    } catch (error) {
        console.error('Failed to generate modifiers report:', error);
        // Return an empty report structure instead of an error
        res.json({
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
            modifiers: []
        });
    }
});

export default router;
