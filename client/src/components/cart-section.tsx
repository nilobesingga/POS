import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PaymentModal from "./payment-modal";
import ReceiptModal from "./receipt-modal";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TaxCategory, StoreSettings, Discount } from "@shared/schema";

export default function CartSection() {
  const { cart, updateQuantity, removeFromCart, clearCart, updateCart } = useCart();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  // Fetch tax categories to get default tax rate
  const { data: taxCategories } = useQuery({
    queryKey: ["/api/tax-categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tax-categories");
      return response.json() as Promise<TaxCategory[]>;
    }
  });

  // Fetch store settings for default tax rate
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Fetch available discounts
  const { data: discounts } = useQuery<Discount[]>({
    queryKey: ["/api/discounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/discounts");
      return response.json();
    }
  });

  // Get default tax rate from tax categories or fall back to store settings rate
  const defaultTaxCategory = taxCategories?.find((cat: TaxCategory) => cat.isDefault);
  const defaultTaxRate = defaultTaxCategory?.rate ?? Number(storeSettings?.taxRate ?? 8.25);

  // Function to apply discount
  const applyDiscount = (discount: Discount | null) => {
    setSelectedDiscount(discount);
    if (discount) {
      let discountAmount = 0;

      // Check for senior citizen discount special case
      if (discount.name.toLowerCase().includes('senior citizen') || discount.name.toLowerCase().includes('senior')) {
        // Standard senior citizen discount is typically 20% (may vary by region)
        const seniorDiscountRate = 0.20; // 20%
        discountAmount = cart.subtotal * seniorDiscountRate;
      } else {
        // Regular discount calculation
        discountAmount = discount.type === 'percent'
          ? (cart.subtotal * Number(discount.value)) / 100
          : Number(discount.value);
      }

      // Update cart context with new discount
      updateCart({ ...cart, discount: Number(discountAmount.toFixed(2)) });
    } else {
      // Remove discount
      updateCart({ ...cart, discount: 0 });
    }
  };

  // Handle successful payment completion
  const handlePaymentComplete = (orderId: number) => {
    setIsPaymentModalOpen(false);
    setCompletedOrderId(orderId);
    setIsReceiptModalOpen(true);
  };

  // Start a new order after receipt
  const handleStartNewOrder = () => {
    setIsReceiptModalOpen(false);
    setCompletedOrderId(null);
  };

  return (
    <>
      <div className="md:w-1/3 flex flex-col bg-white border-l border-gray-200 h-full">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Current Order</h2>
            <button
              className="text-sm text-red-500 hover:text-red-600 font-medium"
              onClick={clearCart}
            >
              Clear All
            </button>
          </div>
          <div className="mt-2 flex items-center p-2 bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-gray-500">Walk-in Customer</span>
            <button className="ml-auto text-primary text-sm font-medium">Change</button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500">Your cart is empty</p>
              <p className="text-sm text-gray-400 mt-1">Add products from the left panel</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.productId} className="flex items-start py-3 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-medium text-base line-clamp-2">{item.name}</h4>
                    <p className="font-semibold ml-2">${item.totalPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500">${item.price.toFixed(2)} x {item.quantity}</span>
                  </div>
                  <div className="flex items-center mt-2">
                    <button
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      title="Decrease quantity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="mx-2 w-8 text-center">{item.quantity}</span>
                    <button
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      title="Increase quantity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <button
                      className="ml-auto text-gray-400 hover:text-red-500"
                      onClick={() => removeFromCart(item.productId)}
                      title="Remove item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Tax ({defaultTaxRate}%)</span>
            <span className="font-medium">${cart.tax.toFixed(2)}</span>
          </div>

          {/* Add Discount Selection */}
          <div className="flex justify-between py-1 items-center">
            <span className="text-gray-600">Discount</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-green-500">-${cart.discount.toFixed(2)}</span>
              <select
                className="text-sm border rounded p-1"
                value={selectedDiscount?.id || ""}
                onChange={(e) => {
                  const discount = discounts?.find(d => d.id === Number(e.target.value)) || null;
                  applyDiscount(discount);
                }}
              >
                <option value="">None</option>
                {discounts?.map(discount => (
                  <option key={discount.id} value={discount.id}>
                    {discount.name} ({discount.type === 'percent' ? `${discount.value}%` : `$${Number(discount.value).toFixed(2)}`})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between py-2 text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">${cart.total.toFixed(2)}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-blue-50"
              disabled={cart.items.length === 0}
            >
              Hold Order
            </Button>
            <Button
              className="bg-primary text-white hover:bg-blue-600"
              disabled={cart.items.length === 0}
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Pay Now
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentComplete={handlePaymentComplete}
        cart={cart}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewOrder={handleStartNewOrder}
        orderId={completedOrderId}
        cart={cart}
      />
    </>
  );
}
