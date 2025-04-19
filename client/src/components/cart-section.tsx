import { useState, useEffect, useRef } from "react";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PaymentModal from "./payment-modal";
import ReceiptModal from "./receipt-modal";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TaxCategory, StoreSettings, Discount, Customer } from "@shared/schema";
import { useCurrency } from "@/hooks/use-currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Helper functions for safe number operations
const safeNumber = (value: any, fallback: number = 0): number => {
  if (value === undefined || value === null) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

const safeCalculation = (calculation: () => number, fallback: number = 0): number => {
  try {
    const result = calculation();
    return isNaN(result) ? fallback : result;
  } catch (error) {
    console.error("Error in calculation:", error);
    return fallback;
  }
};

export default function CartSection() {
  const { format } = useCurrency();
  const { cart, updateQuantity, removeFromCart, clearCart, updateCart } = useCart();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

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

  // Fetch customers
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      return response.json();
    }
  });

  // Get default tax rate from tax categories or fall back to store settings rate with null safety
  const defaultTaxCategory = taxCategories?.find((cat: TaxCategory) => cat.isDefault);
  const defaultTaxRate = safeNumber(defaultTaxCategory?.rate ?? storeSettings?.taxRate ?? 8.25);

  // Function to apply discount
  const applyDiscount = (discount: Discount | null) => {
    setSelectedDiscount(discount);
    if (discount) {
      // Use safe calculation to handle potential errors
      const discountAmount = safeCalculation(() => {
        if (!discount.value || cart.subtotal <= 0) return 0;

        // Check for senior citizen discount special case
        if (discount.name.toLowerCase().includes('senior citizen') || discount.name.toLowerCase().includes('senior')) {
          // Standard senior citizen discount is typically 20% (may vary by region)
          const seniorDiscountRate = 0.20; // 20%
          return cart.subtotal * seniorDiscountRate;
        }

        // Regular discount calculation with null safety
        return discount.type === 'percent'
          ? (cart.subtotal * safeNumber(discount.value, 0)) / 100
          : safeNumber(discount.value, 0);
      }, 0);

      // Update cart context with new discount (ensure we have a valid number)
      updateCart({
        ...cart,
        discount: Number(discountAmount.toFixed(2)) || 0
      });
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

  // Handle click outside for customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter customers when search query changes
  useEffect(() => {
    if (customers && searchQuery) {
      const filtered = customers.filter(customer =>
        customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (customer.phone?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [searchQuery, customers]);

  // Select customer and update cart
  const selectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    updateCart({
      ...cart,
      customerId: customer?.id || null
    });
    setSearchQuery("");
    setShowCustomerSuggestions(false);
  };

  useEffect(() => {
    // Logic to fetch cart-related data when the component mounts
  }, []);

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
          <div className="mt-2 relative" ref={customerSearchRef}>
            <div className="flex items-center p-2 bg-gray-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {selectedCustomer ? (
                <span className="text-gray-700 flex-1">{selectedCustomer.customerName}</span>
              ) : (
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-gray-700 w-full placeholder:text-gray-500"
                  placeholder="Search customer..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                />
              )}
              {selectedCustomer ? (
                <button
                  className="ml-auto text-primary text-sm font-medium"
                  onClick={() => {
                    setSelectedCustomer(null);
                    updateCart({
                      ...cart,
                      customerId: null
                    });
                  }}
                >
                  Change
                </button>
              ) : (
                <button
                  className="ml-auto text-primary text-sm font-medium"
                  onClick={() => setIsCustomerModalOpen(true)}
                >
                  All
                </button>
              )}
            </div>

            {/* Customer Suggestions Dropdown */}
            {showCustomerSuggestions && (searchQuery || !selectedCustomer) && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => selectCustomer(null)}
                >
                  <div className="rounded-full bg-gray-200 w-8 h-8 flex items-center justify-center mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Walk-in Customer</div>
                  </div>
                </div>

                {filteredCustomers.slice(0, 5).map((customer) => (
                  <div
                    key={customer.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                    onClick={() => selectCustomer(customer)}
                  >
                    <div className="rounded-full bg-blue-100 w-8 h-8 flex items-center justify-center mr-2">
                      <span className="text-blue-600 font-semibold">
                        {customer.customerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{customer.customerName}</div>
                      <div className="text-xs text-gray-500">
                        {customer.phone && <span className="mr-2">{customer.phone}</span>}
                        {customer.email && <span>{customer.email}</span>}
                      </div>
                    </div>
                  </div>
                ))}

                {searchQuery && filteredCustomers.length === 0 && (
                  <div className="p-3 text-center text-gray-500">
                    No customers found
                  </div>
                )}

                {filteredCustomers.length > 5 && (
                  <div
                    className="p-2 text-center text-primary hover:bg-gray-100 cursor-pointer border-t"
                    onClick={() => setIsCustomerModalOpen(true)}
                  >
                    View all {filteredCustomers.length} results
                  </div>
                )}
              </div>
            )}
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
                    <p className="font-semibold ml-2">{format(item.totalPrice)}</p>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500">{format(item.price)} x {item.quantity}</span>
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
            <span className="font-medium">{format(cart.subtotal)}</span>
          </div>

          {/* Add Discount Selection */}
          <div className="flex justify-between py-1 items-center">
            <span className="text-gray-600">Discount</span>
            <div className="flex items-center gap-2">
              <select
                className="text-sm border rounded p-1"
                value={selectedDiscount?.id || ""}
                onChange={(e) => {
                  const discountId = safeNumber(e.target.value);
                  const discount = discounts?.find(d => d.id === discountId) || null;
                  applyDiscount(discount);
                }}
              >
                <option value="">None</option>
                {discounts?.map(discount => (
                  <option key={discount.id || 'unknown'} value={discount.id || ''}>
                    {discount.name || 'Unnamed Discount'} (
                    {discount.type === 'percent'
                      ? `${safeNumber(discount.value, 0)}%`
                      : format(safeNumber(discount.value, 0))
                    })
                  </option>
                )) || []}
              </select>
              <span className="font-medium text-red-500">-{format(safeNumber(cart.discount, 0))}</span>
            </div>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Vat ({defaultTaxRate}%)</span>
            <span className="font-medium">{format(cart.tax)}</span>
          </div>
          <div className="flex justify-between py-2 text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{format(cart.total)}</span>
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
        customerName={selectedCustomer ? selectedCustomer.customerName : "Walk-in Customer"}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewOrder={handleStartNewOrder}
        orderId={completedOrderId}
        cart={cart}
      />

      {/* Customer Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            <div className="max-h-[350px] overflow-y-auto border rounded-md">
              <div className="p-3 border-b hover:bg-gray-100 cursor-pointer flex items-center" onClick={() => {
                setSelectedCustomer(null);
                updateCart({
                  ...cart,
                  customerId: null
                });
                setIsCustomerModalOpen(false);
              }}>
                <div className="rounded-full bg-gray-200 w-10 h-10 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">Walk-in Customer</div>
                  <div className="text-xs text-gray-500">Default customer</div>
                </div>
                {selectedCustomer === null && (
                  <div className="bg-blue-100 text-blue-600 rounded-full px-2 py-1 text-xs font-medium">
                    Selected
                  </div>
                )}
              </div>

              {customers && customers.filter(customer =>
                customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (customer.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (customer.phone?.toLowerCase() || "").includes(searchQuery.toLowerCase())
              ).map((customer) => (
                <div
                  key={customer.id}
                  className="p-3 border-b hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    updateCart({
                      ...cart,
                      customerId: customer.id
                    });
                    setIsCustomerModalOpen(false);
                  }}
                >
                  <div className="rounded-full bg-blue-100 w-10 h-10 flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-semibold">
                      {customer.customerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {customer.customerName}
                      {Number(customer.pointsBalance) > 0 && (
                        <span className="bg-green-100 text-green-600 rounded-full px-2 py-0.5 text-xs">
                          {customer.pointsBalance} Points
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                      {customer.email && (
                        <span className="inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {customer.email}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {customer.phone}
                        </span>
                      )}
                      {customer.city && (
                        <span className="inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {customer.city}
                        </span>
                      )}
                    </div>
                    {(safeNumber(customer.totalVisits) > 0 || safeNumber(customer.totalSpent) > 0) && (
                      <div className="text-xs text-gray-600 mt-1">
                        {safeNumber(customer.totalVisits) > 0 && (
                          <span className="mr-3">Visits: {customer.totalVisits}</span>
                        )}
                        {safeNumber(customer.totalSpent) > 0 && (
                          <span>Total: {format(safeNumber(customer.totalSpent))}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedCustomer?.id === customer.id && (
                    <div className="bg-blue-100 text-blue-600 rounded-full px-2 py-1 text-xs font-medium">
                      Selected
                    </div>
                  )}
                </div>
              ))}

              {customers && searchQuery && !customers.some(customer =>
                customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (customer.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (customer.phone?.toLowerCase() || "").includes(searchQuery.toLowerCase())
              ) && (
                <div className="p-4 text-center text-gray-500 flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>No customers found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setIsCustomerModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="ml-2"
              onClick={() => {
                window.open("/customers");
              }}
            >
              Manage Customers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
