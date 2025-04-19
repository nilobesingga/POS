import { useState, useEffect } from "react";
import { Cart } from "@shared/schema";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/use-currency";

// Helper for safe parsing of currency values
const safeParse = (
  parseFunction: (value: string) => number,
  value: string | null | undefined,
  fallback: number = 0
): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  try {
    const result = parseFunction(value);
    return isNaN(result) ? fallback : result;
  } catch (error) {
    console.error("Error parsing currency value:", error);
    return fallback;
  }
};

// Card type detection with regex patterns
type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'dinersclub' | 'jcb' | 'unionpay' | undefined;

const cardPatterns = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  mastercard: /^5[1-5][0-9]{14}$|^2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9][0-9]|7(?:[01][0-9]|20))[0-9]{12}$/,
  amex: /^3[47][0-9]{13}$/,
  discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  dinersclub: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
  jcb: /^(?:2131|1800|35[0-9]{3})[0-9]{11}$/,
  unionpay: /^62[0-9]{14,17}$/
};

// Function to detect card type from number
const detectCardType = (cardNumber: string): CardType => {
  // Remove spaces and non-digit characters
  const cleanNumber = cardNumber.replace(/\D/g, '');

  if (!cleanNumber) return undefined;

  // Check against patterns
  if (cardPatterns.visa.test(cleanNumber)) return 'visa';
  if (cardPatterns.mastercard.test(cleanNumber)) return 'mastercard';
  if (cardPatterns.amex.test(cleanNumber)) return 'amex';
  if (cardPatterns.discover.test(cleanNumber)) return 'discover';
  if (cardPatterns.dinersclub.test(cleanNumber)) return 'dinersclub';
  if (cardPatterns.jcb.test(cleanNumber)) return 'jcb';
  if (cardPatterns.unionpay.test(cleanNumber)) return 'unionpay';

  return undefined;
};

// Luhn algorithm for card number validation
const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\D/g, '');

  if (!cleanNumber || cleanNumber.length < 13) return false;

  let sum = 0;
  let shouldDouble = false;

  // Loop through values starting from the right
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return (sum % 10) === 0;
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (orderId: number) => void;
  cart: Cart;
  customerName?: string;
}

export default function PaymentModal({ isOpen, onClose, onPaymentComplete, cart, customerName = "Walk-in Customer" }: PaymentModalProps) {
  const { checkout, isCheckingOut } = useCart();
  const { toast } = useToast();
  const { format, parse, parseNumber } = useCurrency();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [amountTendered, setAmountTendered] = useState<string>("0");
  const [cardNumber, setCardNumber] = useState("");
  const [cardType, setCardType] = useState<CardType>(undefined);
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardError, setCardError] = useState("");

  // Update amount tendered when cart total changes or payment method changes
  useEffect(() => {
    if (paymentMethod === 'cash' && cart?.total !== undefined && cart?.total > 0) {
      setAmountTendered(Math.ceil(cart.total).toString());
    }
  }, [cart?.total, paymentMethod]);

  // Calculate change with null safety
  const amountTenderedNum = safeParse(parseNumber, amountTendered, 0);
  const cartTotal = (cart?.total !== undefined && cart?.total !== null) ? cart.total : 0;
  const change = Math.max(0, amountTenderedNum - cartTotal);

  // Quick amount buttons
  const quickAmounts = [1, 5, 10, 20, 50, 100];

  // Handle quick amount selection with null safety
  const handleQuickAmount = (amount: number) => {
    try {
      const currentAmount = safeParse(parseNumber, amountTendered, 0);
      setAmountTendered(((currentAmount + amount) || 0).toString());
    } catch (error) {
      console.error("Error adding quick amount:", error);
      // Fallback to just using the amount if there's a parsing error
      setAmountTendered(amount.toString());
    }
  };

  // Format card number with spaces and detect type
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');

    // Detect card type from the number
    const detectedType = detectCardType(v);
    setCardType(detectedType);

    // Validate card number using Luhn algorithm
    if (v.length >= 13) {
      const isValid = validateCardNumber(v);
      setCardError(isValid ? "" : "Invalid card number");
    } else {
      setCardError("");
    }

    // Format the number with spaces
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
      if (amountTenderedNum < cartTotal) {
        toast({
          title: "Payment Error",
          description: "Amount tendered must be greater than or equal to the total amount",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Card payment validation
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
        toast({
          title: "Invalid Card Number",
          description: "Please enter a valid card number",
          variant: "destructive"
        });
        return;
      }

      if (cardError) {
        toast({
          title: "Card Validation Error",
          description: cardError,
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

      // Validate expiry format and date
      const [expMonth, expYear] = cardExpiry.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits of year
      const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed

      if (!expMonth || !expYear ||
          parseInt(expMonth) < 1 ||
          parseInt(expMonth) > 12 ||
          parseInt(expYear) < currentYear ||
          (parseInt(expYear) === currentYear && parseInt(expMonth) < currentMonth)) {
        toast({
          title: "Expired Card",
          description: "The card expiry date is invalid or has passed",
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
      const orderId = await checkout(paymentMethod, paymentMethod === 'cash' ? amountTenderedNum : cartTotal);
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

  // Card logo component based on card type
  const CardLogo = () => {
    if (!cardType) return null;

    return (
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
        {cardType === 'visa' && (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M290 200L330 300L370 200H410L350 350H310L250 200H290Z" fill="#1434CB" />
            <path d="M410 200H530L540 240H450L460 270H540L550 310H470L480 350H440L410 200Z" fill="#1434CB" />
            <path d="M180 200L140 350H100L140 200H180Z" fill="#1434CB" />
            <path d="M190 200H240L280 350H240L230 320H180L170 350H130L190 200ZM225 280L215 240L195 280H225Z" fill="#1434CB" />
          </svg>
        )}
        {cardType === 'mastercard' && (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M490 150C436 150 390 196 390 250C390 304 436 350 490 350C544 350 590 304 590 250C590 196 544 150 490 150Z" fill="#FF5F00" />
            <path d="M350 150C296 150 250 196 250 250C250 304 296 350 350 350C404 350 450 304 450 250C450 196 404 150 350 150Z" fill="#EB001B" />
            <path d="M420 250C420 221 409 194 390 174C371 194 360 221 360 250C360 279 371 306 390 326C409 306 420 279 420 250Z" fill="#F79E1B" />
          </svg>
        )}
        {cardType === 'amex' && (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="100" y="100" width="580" height="300" fill="#006FCF" />
            <path d="M370 300L400 200H440L470 300H430L425 280H400L395 300H370ZM405 260H420L415 240H410L405 260Z" fill="white" />
            <path d="M210 300L240 200H310L320 230H330L340 200H380L350 300H310L300 270H290L280 300H210Z" fill="white" />
            <path d="M470 300L500 200H570L580 230H590L600 200H640L610 300H570L560 270H550L540 300H470Z" fill="white" />
          </svg>
        )}
        {cardType === 'discover' && (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M580 350H200C146 350 100 304 100 250C100 196 146 150 200 150H580C634 150 680 196 680 250C680 304 634 350 580 350Z" fill="#F8F8F8" />
            <path d="M200 150C146 150 100 196 100 250C100 304 146 350 200 350H370C424 350 470 304 470 250C470 196 424 150 370 150H200Z" fill="#F26E21" />
          </svg>
        )}
        {cardType === 'dinersclub' && (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M500 350H280C227 350 180 304 180 250C180 196 227 150 280 150H500C553 150 600 196 600 250C600 304 553 350 500 350Z" fill="#0097D0" />
            <circle cx="390" cy="250" r="80" fill="#FFFFFF" />
          </svg>
        )}
        {cardType === 'jcb' && (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="100" y="100" width="200" height="300" fill="#0A5299" />
            <rect x="290" y="100" width="200" height="300" fill="#0A8244" />
            <rect x="480" y="100" width="200" height="300" fill="#D92C27" />
            <path d="M180 170H220V280H180V170Z" fill="white" />
            <path d="M370 170H410V280H370V170Z" fill="white" />
            <path d="M560 170H600V280H560V170Z" fill="white" />
          </svg>
        )}
        {cardType === 'unionpay' && (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="100" y="150" width="200" height="200" fill="#DE151D" />
            <rect x="290" y="150" width="200" height="200" fill="#007BC5" />
            <rect x="480" y="150" width="200" height="200" fill="#13B176" />
          </svg>
        )}
      </div>
    );
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
                <span className="font-semibold">{format(cartTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer</span>
                <span>{customerName}</span>
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
                  value={format(parse(amountTendered))}
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
                    +{format(amount)}
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Tendered</span>
                  <span className="font-medium">{format(parse(amountTendered))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">{format(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                  <span>Change</span>
                  <span className="text-green-500">{format(change)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className={cardError ? "border-red-500 pr-12" : "pr-12"}
                />
                <CardLogo />
                {cardError && (
                  <p className="text-xs text-red-500 mt-1">{cardError}</p>
                )}
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

              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-gray-500">Supported cards:</span>
                <div className="flex space-x-1">
                  <svg className="h-4 w-6" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M290 200L330 300L370 200H410L350 350H310L250 200H290Z" fill="#1434CB" />
                    <path d="M410 200H530L540 240H450L460 270H540L550 310H470L480 350H440L410 200Z" fill="#1434CB" />
                    <path d="M180 200L140 350H100L140 200H180Z" fill="#1434CB" />
                    <path d="M190 200H240L280 350H240L230 320H180L170 350H130L190 200ZM225 280L215 240L195 280H225Z" fill="#1434CB" />
                  </svg>
                  <svg className="h-4 w-6" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M490 150C436 150 390 196 390 250C390 304 436 350 490 350C544 350 590 304 590 250C590 196 544 150 490 150Z" fill="#FF5F00" />
                    <path d="M350 150C296 150 250 196 250 250C250 304 296 350 350 350C404 350 450 304 450 250C450 196 404 150 350 150Z" fill="#EB001B" />
                    <path d="M420 250C420 221 409 194 390 174C371 194 360 221 360 250C360 279 371 306 390 326C409 306 420 279 420 250Z" fill="#F79E1B" />
                  </svg>
                  <svg className="h-4 w-6" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="100" y="100" width="580" height="300" fill="#006FCF" />
                    <path d="M370 300L400 200H440L470 300H430L425 280H400L395 300H370ZM405 260H420L415 240H410L405 260Z" fill="white" />
                    <path d="M210 300L240 200H310L320 230H330L340 200H380L350 300H310L300 270H290L280 300H210Z" fill="white" />
                    <path d="M470 300L500 200H570L580 230H590L600 200H640L610 300H570L560 270H550L540 300H470Z" fill="white" />
                  </svg>
                  <svg className="h-4 w-6" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M580 350H200C146 350 100 304 100 250C100 196 146 150 200 150H580C634 150 680 196 680 250C680 304 634 350 580 350Z" fill="#F8F8F8" />
                    <path d="M200 150C146 150 100 196 100 250C100 304 146 350 200 350H370C424 350 470 304 470 250C470 196 424 150 370 150H200Z" fill="#F26E21" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-green-500 text-white hover:bg-green-600 mt-6"
            onClick={handleCompletePayment}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? "Processing..." : `Pay ${format(cartTotal)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
