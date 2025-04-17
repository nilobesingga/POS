import { Order, OrderItem } from "@shared/schema";

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
