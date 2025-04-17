import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Cart, Order, OrderItem, TaxCategory, Product, StoreSettings } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { printReceipt, emailReceipt } from "@/lib/receipt-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/auth-context";

const emailFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  orderId: number | null;
  cart: Cart;
}

// Define what the joined structure looks like from the server
interface JoinedOrderItem extends OrderItem {
  products: Product | null;
}

interface OrderResponse {
  order: Order;
  items: JoinedOrderItem[];
}

export default function ReceiptModal({ isOpen, onClose, onNewOrder, orderId, cart }: ReceiptModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const form = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const {
    data: orderData,
    isLoading,
    isError,
    refetch
  } = useQuery<OrderResponse>({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/orders/${orderId}`);
      const data = await response.json();
      console.log("Order data from server:", data); // Debug log to see the raw response
      return data;
    },
    enabled: !!orderId && isOpen,
  });

  // If order changes or modal opens, refetch data
  useEffect(() => {
    if (isOpen && orderId) {
      refetch();
    }
  }, [isOpen, orderId, refetch]);

  // Fetch store settings for default tax rate
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Fetch tax categories to get default tax rate
  const { data: taxCategories } = useQuery<TaxCategory[]>({
    queryKey: ["/api/tax-categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tax-categories");
      return response.json();
    }
  });

  // Get default tax rate from tax categories or fall back to store settings rate
  const defaultTaxCategory = taxCategories?.find((cat: TaxCategory) => cat.isDefault);
  const defaultTaxRate = defaultTaxCategory?.rate ?? Number(storeSettings?.taxRate ?? 8.25);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    try {
      printReceipt(receiptRef.current);
    } catch (error) {
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Failed to print receipt",
        variant: "destructive"
      });
    }
  };

  const handleEmail = async (values: z.infer<typeof emailFormSchema>) => {
    if (!orderData?.order) return;

    setIsSending(true);
    try {
      await emailReceipt(orderData.order, orderData.items, values.email);
      setIsEmailDialogOpen(false);
      form.reset();
      toast({
        title: "Receipt Sent",
        description: "Receipt has been sent to your email"
      });
    } catch (error) {
      toast({
        title: "Email Error",
        description: "Failed to send receipt email",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to safely extract price from order items
  const extractPrice = (item: JoinedOrderItem): number => {
    // First check if price exists directly on the item
    if (item.price !== undefined && item.price !== null) {
      // Handle different types of price data
      if (typeof item.price === 'string') {
        return parseFloat(item.price);
      } else if (typeof item.price === 'number') {
        return item.price;
      } else if (typeof item.price === 'object' && item.price !== null) {
        // For numeric SQL types that might be returned as objects with value property
        const priceObj = item.price as { value?: unknown };
        if (priceObj && 'value' in priceObj) {
          return Number(priceObj.value);
        }
      }
    }

    // If no price found on item, try to get it from the product
    if (item.products?.price) {
      return Number(item.products.price);
    }

    // If all else fails, return 0
    return 0;
  };

  // Helper function to safely extract quantity from order items
  const extractQuantity = (item: JoinedOrderItem | any): number => {
    if (!item) {
      return 0;
    }

    // First, check for the quantity field directly (from our updated server query)
    if (item.quantity !== undefined) {
      // Handle various data types for quantity
      if (typeof item.quantity === 'number') {
        return item.quantity;
      } else if (typeof item.quantity === 'string') {
        return parseInt(item.quantity, 10) || 0;
      } else if (typeof item.quantity === 'object' && item.quantity !== null) {
        // PostgreSQL numeric types can be returned as objects
        const quantityObj = item.quantity as any;
        if ('value' in quantityObj) {
          return Number(quantityObj.value) || 0;
        }
      }
    }

    // If not found in the expected location, check common variations
    // due to how different ORM/database drivers might name the columns
    const possibleKeys = [
      'orderItems_quantity',
      'order_items_quantity',
      'item_quantity',
      'itemQuantity'
    ];

    for (const key of possibleKeys) {
      if (item[key] !== undefined) {
        return Number(item[key]) || 0;
      }
    }

    // As a last resort, search all properties for anything containing 'quantity'
    for (const key of Object.keys(item)) {
      if (key.toLowerCase().includes('quantity')) {
        const value = item[key];
        if (value !== undefined && value !== null) {
          return Number(value) || 0;
        }
      }
    }

    return 0;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Receipt</h3>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <Skeleton className="h-6 w-1/2 mx-auto mb-2" />
                  <Skeleton className="h-4 w-1/3 mx-auto mb-1" />
                  <Skeleton className="h-4 w-2/3 mx-auto mb-1" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <div className="border-t border-dashed border-gray-300 my-2"></div>
                </div>

                {Array(3).fill(0).map((_, index) => (
                  <div key={index} className="flex justify-between py-1 text-sm">
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="text-center p-4">
                <p className="text-red-500">Failed to load receipt data.</p>
                <Button className="mt-4" onClick={onNewOrder}>Start New Order</Button>
              </div>
            ) : (
              <>
                <div ref={receiptRef}>
                  <div className="text-center mb-4">
                    {storeSettings?.logo && (
                      <img
                        src={storeSettings.logo}
                        alt="Store Logo"
                        className="mx-auto mb-2 max-h-16"
                      />
                    )}
                    <h3 className="text-xl font-bold">{storeSettings?.name ?? 'Le Bistro'}</h3>
                    <p className="text-gray-500">{storeSettings?.address ?? '123 Main Street'}</p>
                    <p className="text-gray-500">{storeSettings?.city}, {storeSettings?.state} {storeSettings?.zipCode}</p>
                    <p className="text-gray-500">Tel: {storeSettings?.phone ?? '(123) 456-7890'}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        {orderData?.order && `Order #${orderData.order.orderNumber}`}
                      </span>
                      <span>
                        {orderData?.order &&
                        format(new Date(orderData.order.createdAt), "MM/dd/yyyy hh:mm a")}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">Cashier: {user?.displayName || "Unknown"}</div>
                    <div className="border-t border-dashed border-gray-300 my-2"></div>
                  </div>

                  <div className="mb-4">
                    {orderData?.items && orderData.items.length > 0 ? (
                      orderData.items.map((item) => {
                        // Get product name from the joined structure
                        const productName = item.products?.name || "Unknown Product";
                        // Use the helper function to extract price
                        const price = extractPrice(item);
                        // Use the helper function to extract quantity
                        const quantity = extractQuantity(item);
                        const totalPrice = price * quantity;

                        return (
                          <div key={item.id} className="flex justify-between py-1 text-sm">
                            <div className="flex-1">
                              <div className="font-medium">
                                {productName}
                              </div>
                              <div className="text-gray-500">${price.toFixed(2)} x {quantity}</div>
                            </div>
                            <div className="font-medium ml-4 text-right">${totalPrice.toFixed(2)}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-500 py-2">No items in this order</div>
                    )}

                    <div className="border-t border-dashed border-gray-300 my-2"></div>

                    <div className="flex justify-between py-1 text-sm">
                      <span>Subtotal</span>
                      <span>${orderData?.order && Number(orderData.order.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-sm">
                      <span>Tax ({defaultTaxRate}%)</span>
                      <span>${orderData?.order && Number(orderData.order.tax).toFixed(2)}</span>
                    </div>
                    {orderData?.order && Number(orderData.order.discount) > 0 && (
                      <div className="flex justify-between py-1 text-sm text-green-500">
                        <span>Discount</span>
                        <span>-${Number(orderData.order.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 font-bold">
                      <span>Total</span>
                      <span>${orderData?.order && Number(orderData.order.total).toFixed(2)}</span>
                    </div>

                    <div className="border-t border-dashed border-gray-300 my-2"></div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Payment Method</span>
                        <span className="capitalize">{orderData?.order?.paymentMethod}</span>
                      </div>
                      {orderData?.order?.paymentMethod === 'cash' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Amount Tendered</span>
                            <span>${orderData?.order && Number(orderData.order.amountTendered).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Change</span>
                            <span>${orderData?.order && Number(orderData.order.change).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-500 mb-4">
                    <p>Thank you for your purchase!</p>
                    <p>Please come again</p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    className="text-primary border-primary hover:bg-blue-50"
                    onClick={handlePrint}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    className="text-gray-700 border-gray-300 hover:bg-gray-50"
                    onClick={() => setIsEmailDialogOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </Button>
                  <Button
                    className="bg-primary text-white hover:bg-blue-600"
                    onClick={onNewOrder}
                  >
                    New Order
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Receipt</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmail)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Enter email address"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEmailDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSending || !form.formState.isValid}
                >
                  {isSending ? "Sending..." : "Send Receipt"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
