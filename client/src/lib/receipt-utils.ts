import { Order, OrderItem } from "@shared/schema";
import { formatCurrency } from "./currency-utils";

/**
 * Safely converts a value to a number for currency calculations
 * @param value - The value to convert
 * @returns A number (0 if conversion fails)
 */
export function safeNumberForCurrency(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === 'object') {
    // For numeric SQL types that might be returned as objects
    const valueObj = value as { value?: unknown };
    if (valueObj && 'value' in valueObj) {
      return safeNumberForCurrency(valueObj.value);
    }
  }

  return 0;
}

/**
 * Calculate the total for an order item considering quantity and price
 * @param item - The order item
 * @returns The calculated total as a number
 */
export function calculateItemTotal(item: OrderItem): number {
  const price = safeNumberForCurrency(item.price);
  const quantity = safeNumberForCurrency(item.quantity);
  return price * quantity;
}

export function printReceipt(receiptContent: HTMLElement) {
  const printWindow = window.open('', '', 'width=600,height=800');
  if (!printWindow) {
    throw new Error('Unable to open print window');
  }

  // Apply print-specific styles
  printWindow.document.write(`
    <html>
      <head>
        <style>
          @page {
            margin: 0;
            size: 80mm 297mm;  /* Standard thermal receipt size */
          }
          body {
            margin: 0;
            padding: 10px;
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }
          .receipt-content {
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
          }
          .dashed-line {
            border-top: 1px dashed #ccc;
            margin: 8px 0;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-sm { font-size: 11px; }
          .mb-2 { margin-bottom: 8px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-content">
          ${receiptContent.innerHTML}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
}

export async function emailReceipt(order: Order, items: OrderItem[], emailAddress: string) {
  try {
    const response = await fetch('/api/orders/email-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: order.id,
        emailAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Failed to send receipt email:', error);
    throw error;
  }
}

/**
 * Generates a summary of the order for receipt display or printing
 * @param order - The order object
 * @param items - The order items
 * @returns An object containing the summary data
 */
export function generateReceiptSummary(order: Order | null | undefined, items: OrderItem[] | null | undefined) {
  if (!order) {
    return {
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      itemCount: 0,
    };
  }

  const itemCount = items?.length || 0;
  const subtotal = safeNumberForCurrency(order.subtotal);
  const tax = safeNumberForCurrency(order.tax);
  const discount = safeNumberForCurrency(order.discount);
  const total = safeNumberForCurrency(order.total);

  return {
    subtotal,
    tax,
    discount,
    total,
    itemCount,
  };
}
