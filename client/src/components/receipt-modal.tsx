import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cart } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  orderId: number | null;
  cart: Cart;
}

export default function ReceiptModal({ isOpen, onClose, onNewOrder, orderId, cart }: ReceiptModalProps) {
  // Query order details if we have an orderId
  const { 
    data: orderData,
    isLoading,
    isError
  } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId && isOpen,
  });
  
  if (!isOpen) return null;
  
  return (
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
            // Loading state
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
            // Error state
            <div className="text-center p-4">
              <p className="text-red-500">Failed to load receipt data.</p>
              <Button className="mt-4" onClick={onNewOrder}>Start New Order</Button>
            </div>
          ) : (
            // Receipt content
            <>
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold">Café Loyverse</h3>
                <p className="text-gray-500">123 Main Street</p>
                <p className="text-gray-500">City, State 12345</p>
                <p className="text-gray-500">Tel: (123) 456-7890</p>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    {orderData && orderData.order && `Order #${orderData.order.orderNumber}`}
                  </span>
                  <span>
                    {orderData && orderData.order && 
                     format(new Date(orderData.order.createdAt), "MM/dd/yyyy hh:mm a")}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-2">Cashier: John Smith</div>
                <div className="border-t border-dashed border-gray-300 my-2"></div>
              </div>
              
              <div className="mb-4">
                {orderData && orderData.items && orderData.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between py-1 text-sm">
                    <div>
                      <div>{item.name || `Product #${item.productId}`}</div>
                      <div className="text-gray-500">${Number(item.price).toFixed(2)} x {item.quantity}</div>
                    </div>
                    <div className="font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
                
                <div className="border-t border-dashed border-gray-300 my-2"></div>
                
                <div className="flex justify-between py-1 text-sm">
                  <span>Subtotal</span>
                  <span>${orderData && orderData.order && Number(orderData.order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Tax (8.25%)</span>
                  <span>${orderData && orderData.order && Number(orderData.order.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold">
                  <span>Total</span>
                  <span>${orderData && orderData.order && Number(orderData.order.total).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-dashed border-gray-300 my-2"></div>
                
                <div className="flex justify-between py-1 text-sm">
                  <span>Payment: {orderData && orderData.order && orderData.order.paymentMethod}</span>
                  <span>${orderData && orderData.order && Number(orderData.order.amountTendered).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Change</span>
                  <span>${orderData && orderData.order && Number(orderData.order.change).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-500 mb-4">
                <p>Thank you for your purchase!</p>
                <p>Please come again</p>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  className="text-primary border-primary hover:bg-blue-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </Button>
                <Button 
                  variant="outline" 
                  className="text-gray-700 border-gray-300 hover:bg-gray-50"
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
  );
}
