import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Cart, CartItem, Product, TaxCategory, StoreSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./auth-context";

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  checkout: (paymentMethod: string, amountTendered: number) => Promise<number>;
  isCheckingOut: boolean;
  updateCart: (newCart: Cart) => void;
}

const defaultCart: Cart = {
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(defaultCart);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(8.25); // Default fallback rate

  // Fetch store settings and tax categories for default tax rate
  useEffect(() => {
    const fetchDefaultTaxRate = async () => {
      try {
        // Fetch tax categories
        const taxResponse = await apiRequest("GET", "/api/tax-categories");
        const taxCategories = await taxResponse.json();
        const defaultCategory = taxCategories.find((cat: TaxCategory) => cat.isDefault);

        // Fetch store settings
        const settingsResponse = await apiRequest("GET", "/api/store-settings");
        const storeSettings: StoreSettings = await settingsResponse.json();

        // Use tax category rate if available, otherwise use store settings rate
        if (defaultCategory) {
          setDefaultTaxRate(Number(defaultCategory.rate));
        } else if (storeSettings?.taxRate) {
          setDefaultTaxRate(Number(storeSettings.taxRate));
        }
      } catch (error) {
        console.error('Failed to fetch tax rate:', error);
      }
    };
    fetchDefaultTaxRate();
  }, []);

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = defaultTaxRate / 100; // Convert percentage to decimal
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax - cart.discount).toFixed(2));

    setCart(prev => ({
      ...prev,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      total
    }));
  }, [cart.items, cart.discount, defaultTaxRate]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.items.findIndex(item => item.productId === product.id);

      if (existingItemIndex >= 0) {
        // Item already in cart, update quantity
        const updatedItems = [...prevCart.items];
        const item = updatedItems[existingItemIndex];
        const newQuantity = item.quantity + quantity;

        updatedItems[existingItemIndex] = {
          ...item,
          quantity: newQuantity,
          totalPrice: Number((Number(product.price) * newQuantity).toFixed(2))
        };

        return {
          ...prevCart,
          items: updatedItems
        };
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity,
          totalPrice: Number((Number(product.price) * quantity).toFixed(2))
        };

        return {
          ...prevCart,
          items: [...prevCart.items, newItem]
        };
      }
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(item => item.productId !== productId)
    }));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => {
      const updatedItems = prevCart.items.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity,
            totalPrice: Number((item.price * quantity).toFixed(2))
          };
        }
        return item;
      });

      return {
        ...prevCart,
        items: updatedItems
      };
    });
  };

  const clearCart = () => {
    setCart(defaultCart);
  };

  const checkout = async (paymentMethod: string, amountTendered: number) => {
    setIsCheckingOut(true);

    try {
      // Generate unique order number with timestamp and random string
      const timestamp = new Date().getTime();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const orderNumber = `ORD-${timestamp}-${random}`;

      // Create order DTO with string values for numeric fields
      const orderData = {
        order: {
          orderNumber,
          status: "completed",
          subtotal: cart.subtotal.toFixed(2),
          tax: cart.tax.toFixed(2),
          discount: cart.discount.toFixed(2),
          total: cart.total.toFixed(2),
          paymentMethod,
          amountTendered: amountTendered.toFixed(2),
          change: paymentMethod === 'cash' ? (amountTendered - cart.total).toFixed(2) : "0.00",
          cashierId: user?.id || 1, // Use the current user's ID if available
        },
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          name: item.name,
          totalPrice: item.totalPrice.toFixed(2)
        }))
      };

      const response = await apiRequest("POST", "/api/orders", orderData);
      const newOrder = await response.json();

      // Clear the cart after successful checkout
      clearCart();

      return newOrder.id;
    } catch (error) {
      console.error("Checkout failed:", error);
      throw error;
    } finally {
      setIsCheckingOut(false);
    }
  };

  const updateCart = (newCart: Cart) => {
    setCart(newCart);
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      checkout,
      isCheckingOut,
      updateCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
