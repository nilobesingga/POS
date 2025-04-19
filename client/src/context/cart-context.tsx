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
  total: 0,
  customerId: null
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
        const defaultCategory = Array.isArray(taxCategories) ?
          taxCategories.find((cat: TaxCategory) => cat.isDefault) : null;

        // Fetch store settings
        const settingsResponse = await apiRequest("GET", "/api/store-settings");
        const storeSettings: StoreSettings = await settingsResponse.json();

        // Use tax category rate if available, otherwise use store settings rate
        if (defaultCategory && defaultCategory.rate) {
          const rate = Number(defaultCategory.rate);
          setDefaultTaxRate(isNaN(rate) ? 0 : rate);
        } else if (storeSettings?.taxRate) {
          const rate = Number(storeSettings.taxRate);
          setDefaultTaxRate(isNaN(rate) ? 0 : rate);
        }
      } catch (error) {
        console.error('Failed to fetch tax rate:', error);
      }
    };
    fetchDefaultTaxRate();
  }, []);

  // Calculate totals whenever items change
  useEffect(() => {
    // Safely calculate subtotal with null checks
    const subtotal = cart.items.reduce((sum, item) => {
      // Handle potentially null or undefined totalPrice
      const itemTotal = typeof item.totalPrice === 'number' ? item.totalPrice :
        typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : 0;

      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);

    // Ensure tax rate is valid
    const taxRate = (typeof defaultTaxRate === 'number' && !isNaN(defaultTaxRate))
      ? (defaultTaxRate / 100)
      : 0; // Convert percentage to decimal

    const tax = Number((subtotal * taxRate).toFixed(2));

    // Ensure discount is valid
    const discount = typeof cart.discount === 'number' && !isNaN(cart.discount)
      ? cart.discount
      : 0;

    const total = Number((subtotal + tax - discount).toFixed(2));

    setCart(prev => ({
      ...prev,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      total: total < 0 ? 0 : total // Ensure total is never negative
    }));
  }, [cart.items, cart.discount, defaultTaxRate]);

  const addToCart = (product: Product, quantity = 1) => {
    // Guard against null or undefined product
    if (!product || product.id === undefined) {
      console.warn('Attempted to add invalid product to cart');
      return;
    }

    // Ensure price is a number
    const productPrice = typeof product.price === 'string' ?
      Number(product.price) : (typeof product.price === 'number' ?
        product.price : 0);

    if (isNaN(productPrice)) {
      console.warn(`Invalid price for product ${product.name}: ${product.price}`);
    }

    const safePrice = isNaN(productPrice) ? 0 : productPrice;

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
          totalPrice: Number((safePrice * newQuantity).toFixed(2))
        };

        return {
          ...prevCart,
          items: updatedItems
        };
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          productId: product.id,
          name: product.name || `Product #${product.id}`,
          price: safePrice,
          quantity,
          totalPrice: Number((safePrice * quantity).toFixed(2))
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
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    // Validate input parameters
    if (!paymentMethod) {
      throw new Error("Payment method is required");
    }

    // Ensure amountTendered is a valid number
    const safeAmountTendered = typeof amountTendered === 'number' && !isNaN(amountTendered)
      ? amountTendered
      : typeof amountTendered === 'string' ? parseFloat(amountTendered) : 0;

    if (paymentMethod === 'cash' && safeAmountTendered < cart.total) {
      throw new Error("Amount tendered must be greater than or equal to the total amount");
    }

    setIsCheckingOut(true);

    try {
      // Get the store settings to get the store ID
      const settingsResponse = await apiRequest("GET", "/api/store-settings");
      const storeSettings = await settingsResponse.json();

      // Check if we have any store settings
      if (!storeSettings || (!Array.isArray(storeSettings) && !storeSettings?.id) || (Array.isArray(storeSettings) && storeSettings.length === 0)) {
        throw new Error("No active store found. Please configure store settings first.");
      }

      // If we get an array of stores, use the first active one
      const activeStore = Array.isArray(storeSettings)
        ? storeSettings.find(store => store.isActive) || storeSettings[0]
        : storeSettings;

      if (!activeStore.id) {
        throw new Error("Invalid store configuration. Please check store settings.");
      }

      // Ensure all values are valid numbers
      const safeSubtotal = typeof cart.subtotal === 'number' && !isNaN(cart.subtotal) ? cart.subtotal : 0;
      const safeTax = typeof cart.tax === 'number' && !isNaN(cart.tax) ? cart.tax : 0;
      const safeDiscount = typeof cart.discount === 'number' && !isNaN(cart.discount) ? cart.discount : 0;
      const safeTotal = typeof cart.total === 'number' && !isNaN(cart.total) ? cart.total : 0;

      // Calculate change safely
      const safeChange = paymentMethod === 'cash'
        ? Math.max(0, safeAmountTendered - safeTotal)
        : 0;

      // Create order data with safe values
      const orderData = {
        order: {
          storeId: activeStore.id,
          userId: user.id,
          customerId: cart.customerId || null,
          status: "completed",
          subtotal: safeSubtotal,
          tax: safeTax,
          discount: safeDiscount,
          total: safeTotal,
          paymentMethod,
          amountTendered: safeAmountTendered,
          change: safeChange
        },
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0,
          name: item.name || `Product #${item.productId}`,
          totalPrice: typeof item.totalPrice === 'number' && !isNaN(item.totalPrice) ?
            item.totalPrice : 0
        }))
      };

      const response = await apiRequest("POST", "/api/orders", orderData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

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
