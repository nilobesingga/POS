import { useState, useEffect } from "react";
import { Cart } from "@shared/schema";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

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
  const [amountTendered, setAmountTendered] = useState<string>("0");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // Update amount tendered when cart total changes or payment method changes
  useEffect(() => {
    if (cart.total > 0 && paymentMethod === 'cash') {
      setAmountTendered(Math.ceil(cart.total).toString());
    }
  }, [cart.total, paymentMethod]);

  // Calculate change
  const amountTenderedNum = parseFloat(amountTendered) || 0;
  const change = Math.max(0, amountTenderedNum - cart.total);

  // Quick amount buttons
  const quickAmounts = [1, 5, 10, 20, 50, 100];

  // Handle quick amount selection
  const handleQuickAmount = (amount: number) => {
    const currentAmount = parseFloat(amountTendered) || 0;
    setAmountTendered((currentAmount + amount).toString());
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format card expiry
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + (v.length > 2 ? '/' + v.slice(2, 4) : '');
    }
    return v;
  };

  // Handle payment completion
  const handleCompletePayment = async () => {
    // Validate based on payment method
    if (paymentMethod === 'cash') {
      if (amountTenderedNum < cart.total) {
        toast({
          title: "Payment Error",
          description: "Amount tendered must be greater than or equal to the total amount",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Card payment validation
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        toast({
          title: "Invalid Card Number",
          description: "Please enter a valid card number",
          variant: "destructive"
        });
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        toast({
          title: "Invalid Expiry Date",
          description: "Please enter a valid expiry date (MM/YY)",
          variant: "destructive"
        });
        return;
      }
      if (!cardCvc || cardCvc.length < 3) {
        toast({
          title: "Invalid CVC",
          description: "Please enter a valid CVC",
          variant: "destructive"
        });
        return;
      }
      if (!cardName) {
        toast({
          title: "Missing Name",
          description: "Please enter the cardholder's name",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const orderId = await checkout(paymentMethod, paymentMethod === 'cash' ? amountTenderedNum : cart.total);
      // Reset form
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setCardName("");
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

          {paymentMethod === 'cash' ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Amount Tendered</h4>
                <Input
                  type="text"
                  value={amountTendered}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setAmountTendered(value);
                  }}
                  className="text-right font-semibold"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    className="bg-gray-100 text-gray-700 rounded p-2 text-center hover:bg-gray-200"
                    onClick={() => handleQuickAmount(amount)}
                  >
                    +${amount}
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Tendered</span>
                  <span className="font-medium">${parseFloat(amountTendered || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">${cart.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                  <span>Change</span>
                  <span className="text-green-500">${change.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardExpiry">Expiry Date</Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cardCvc">CVC</Label>
                  <Input
                    id="cardCvc"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="JOHN SMITH"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          )}

          <Button
            className="w-full bg-green-500 text-white hover:bg-green-600 mt-6"
            onClick={handleCompletePayment}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? "Processing..." : `Pay ${cart.total.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
