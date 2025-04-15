import { useState } from "react";
import { Cart } from "@shared/schema";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (orderId: number) => void;
  cart: Cart;
}

export default function PaymentModal({ isOpen, onClose, onPaymentComplete, cart }: PaymentModalProps) {
  const { checkout, isCheckingOut } = useCart();
  const { toast } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [amountTendered, setAmountTendered] = useState<string>(
    cart.total > 0 ? Math.ceil(cart.total).toString() : "0"
  );
  
  // Update amount tendered when cart total changes
  useState(() => {
    if (cart.total > 0) {
      setAmountTendered(Math.ceil(cart.total).toString());
    }
  });
  
  // Calculate change
  const amountTenderedNum = parseFloat(amountTendered) || 0;
  const change = Math.max(0, amountTenderedNum - cart.total);
  
  // Quick amount buttons
  const quickAmounts = [1, 5, 10, 20, 50, 100];
  
  // Handle quick amount selection
  const handleQuickAmount = (amount: number) => {
    setAmountTendered((parseFloat(amountTendered) + amount).toString());
  };
  
  // Handle payment completion
  const handleCompletePayment = async () => {
    if (amountTenderedNum < cart.total && paymentMethod === 'cash') {
      toast({
        title: "Payment Error",
        description: "Amount tendered must be greater than or equal to the total amount",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const orderId = await checkout(paymentMethod, amountTenderedNum);
      onPaymentComplete(orderId);
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment",
        variant: "destructive"
      });
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Payment</h3>
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
          <div className="mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold">${cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer</span>
                <span>Walk-in Customer</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium mb-2">Payment Method</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                className={paymentMethod === 'cash' ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-300'}
                onClick={() => setPaymentMethod('cash')}
              >
                Cash
              </Button>
              <Button
                className={paymentMethod === 'card' ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-300'}
                onClick={() => setPaymentMethod('card')}
              >
                Card
              </Button>
            </div>
          </div>
          
          {paymentMethod === 'cash' && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Amount Tendered</h4>
              <Input
                type="text"
                value={`$${amountTendered}`}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setAmountTendered(value);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-right font-semibold"
              />
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    className="bg-gray-100 text-gray-700 rounded p-2 text-center hover:bg-gray-200"
                    onClick={() => handleQuickAmount(amount)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {paymentMethod === 'cash' && (
            <div className="mb-4">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Amount Tendered</span>
                <span className="font-medium">${parseFloat(amountTendered).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Total</span>
                <span className="font-medium">${cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 text-lg font-bold">
                <span>Change</span>
                <span className="text-green-500">${change.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <Button
            className="w-full bg-green-500 text-white hover:bg-green-600"
            onClick={handleCompletePayment}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? "Processing..." : "Complete Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
