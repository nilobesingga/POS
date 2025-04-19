import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Cart, CartItem, Product, TaxCategory, StoreSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./auth-context";

// Extended CartItem to include taxable status
interface ExtendedCartItem extends CartItem {
  isTaxable?: boolean;
}

// Extending Cart to use ExtendedCartItem
interface ExtendedCart extends Omit<Cart, 'items'> {
  items: ExtendedCartItem[];
  isOnHold?: boolean;
  holdId?: string;  // Unique ID for held orders
}

// Define held order structure
interface HeldOrder {
  id: string;
  name: string;
  timestamp: Date;
  cart: ExtendedCart;
}

interface CartContextType {
  cart: ExtendedCart;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  checkout: (paymentMethod: string, amountTendered: number) => Promise<number>;
  isCheckingOut: boolean;
  updateCart: (newCart: ExtendedCart) => void;
  holdOrder: (name?: string) => string;
  retrieveHeldOrder: (id: string) => void;
  heldOrders: HeldOrder[];
  deleteHeldOrder: (id: string) => void;
  voidItem: (productId: number) => void;
  voidOrder: () => void;
}

const defaultCart: ExtendedCart = {
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  isOnHold: false,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<ExtendedCart>(defaultCart);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(8.25); // Default fallback rate
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  // Fetch store settings and tax categories for default tax rate
  useEffect(() => {
    const fetchDefaultTaxRate = async () => {
      try {
        const taxResponse = await apiRequest("GET", "/api/tax-categories");
        const taxCategories = await taxResponse.json();
        const defaultCategory = Array.isArray(taxCategories) ?
          taxCategories.find((cat: TaxCategory) => cat.isDefault) : null;

        const settingsResponse = await apiRequest("GET", "/api/store-settings");
        const storeSettings: StoreSettings = await settingsResponse.json();

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

  // Load held orders from localStorage
  useEffect(() => {
    try {
      const savedHeldOrders = localStorage.getItem('heldOrders');
      if (savedHeldOrders) {
        const parsedOrders = JSON.parse(savedHeldOrders);
        const formattedOrders = parsedOrders.map((order: any) => ({
          ...order,
          timestamp: new Date(order.timestamp)
        }));
        setHeldOrders(formattedOrders);
      }
    } catch (error) {
      console.error('Failed to load held orders:', error);
    }
  }, []);

  // Save held orders to localStorage when they change
  useEffect(() => {
    if (heldOrders.length > 0) {
      localStorage.setItem('heldOrders', JSON.stringify(heldOrders));
    }
  }, [heldOrders]);

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = cart.items.reduce((sum, item) => {
      const itemTotal = typeof item.totalPrice === 'number' ? item.totalPrice :
        typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : 0;

      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);

    const taxRate = (typeof defaultTaxRate === 'number' && !isNaN(defaultTaxRate))
      ? (defaultTaxRate / 100)
      : 0;

    const taxableAmount = cart.items.reduce((sum, item) => {
      if (item.isTaxable === false) {
        return sum;
      }

      const itemTotal = typeof item.totalPrice === 'number' ? item.totalPrice :
        typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : 0;

      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);

    const tax = Number((taxableAmount * taxRate).toFixed(2));

    const discount = typeof cart.discount === 'number' && !isNaN(cart.discount)
      ? cart.discount
      : 0;

    const total = Number((subtotal + tax - discount).toFixed(2));

    setCart(prev => ({
      ...prev,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      total: total < 0 ? 0 : total
    }));
  }, [cart.items, cart.discount, defaultTaxRate]);

  const addToCart = (product: Product, quantity = 1) => {
    if (!product || product.id === undefined) {
      console.warn('Attempted to add invalid product to cart');
      return;
    }

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
        const newItem: ExtendedCartItem = {
          productId: product.id,
          name: product.name || `Product #${product.id}`,
          price: safePrice,
          quantity,
          totalPrice: Number((safePrice * quantity).toFixed(2)),
          isTaxable: product.isTaxable !== false
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

  const holdOrder = (name?: string): string => {
    const id = `hold-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const orderName = name || `Order #${heldOrders.length + 1}`;
    const heldOrder: HeldOrder = {
      id,
      name: orderName,
      timestamp: new Date(),
      cart: {
        ...cart,
        isOnHold: true,
        holdId: id
      }
    };

    setHeldOrders(prev => [...prev, heldOrder]);
    clearCart();
    return id;
  };

  const retrieveHeldOrder = (id: string) => {
    const heldOrder = heldOrders.find(order => order.id === id);

    if (heldOrder) {
      setCart(heldOrder.cart);
      setHeldOrders(prev => prev.filter(order => order.id !== id));

      const updatedHeldOrders = heldOrders.filter(order => order.id !== id);
      if (updatedHeldOrders.length > 0) {
        localStorage.setItem('heldOrders', JSON.stringify(updatedHeldOrders));
      } else {
        localStorage.removeItem('heldOrders');
      }
    }
  };

  const deleteHeldOrder = (id: string) => {
    setHeldOrders(prev => prev.filter(order => order.id !== id));

    const updatedHeldOrders = heldOrders.filter(order => order.id !== id);
    if (updatedHeldOrders.length > 0) {
      localStorage.setItem('heldOrders', JSON.stringify(updatedHeldOrders));
    } else {
      localStorage.removeItem('heldOrders');
    }
  };

  const voidItem = (productId: number) => {
    const itemToVoid = cart.items.find(item => item.productId === productId);

    if (itemToVoid && user) {
      const voidLog = {
        timestamp: new Date(),
        userId: user.id,
        username: user.username,
        action: 'void_item',
        details: {
          productId: productId,
          productName: itemToVoid.name,
          quantity: itemToVoid.quantity,
          price: itemToVoid.price,
          totalPrice: itemToVoid.totalPrice
        }
      };

      console.log('Void logged:', voidLog);
    }

    removeFromCart(productId);
  };

  const voidOrder = () => {
    if (cart.items.length > 0 && user) {
      const voidLog = {
        timestamp: new Date(),
        userId: user.id,
        username: user.username,
        action: 'void_order',
        details: {
          items: cart.items.map(item => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
          })),
          subtotal: cart.subtotal,
          tax: cart.tax,
          discount: cart.discount,
          total: cart.total
        }
      };

      console.log('Order void logged:', voidLog);
    }

    clearCart();
  };

  const checkout = async (paymentMethod: string, amountTendered: number) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    if (!paymentMethod) {
      throw new Error("Payment method is required");
    }

    const safeAmountTendered = typeof amountTendered === 'number' && !isNaN(amountTendered)
      ? amountTendered
      : typeof amountTendered === 'string' ? parseFloat(amountTendered) : 0;

    if (paymentMethod === 'cash' && safeAmountTendered < cart.total) {
      throw new Error("Amount tendered must be greater than or equal to the total amount");
    }

    setIsCheckingOut(true);

    try {
      const settingsResponse = await apiRequest("GET", "/api/store-settings");
      const storeSettings = await settingsResponse.json();

      if (!storeSettings || (!Array.isArray(storeSettings) && !storeSettings?.id) || (Array.isArray(storeSettings) && storeSettings.length === 0)) {
        throw new Error("No active store found. Please configure store settings first.");
      }

      const activeStore = Array.isArray(storeSettings)
        ? storeSettings.find(store => store.isActive) || storeSettings[0]
        : storeSettings;

      if (!activeStore.id) {
        throw new Error("Invalid store configuration. Please check store settings.");
      }

      const safeSubtotal = typeof cart.subtotal === 'number' && !isNaN(cart.subtotal) ? cart.subtotal : 0;
      const safeTax = typeof cart.tax === 'number' && !isNaN(cart.tax) ? cart.tax : 0;
      const safeDiscount = typeof cart.discount === 'number' && !isNaN(cart.discount) ? cart.discount : 0;
      const safeTotal = typeof cart.total === 'number' && !isNaN(cart.total) ? cart.total : 0;

      const safeChange = paymentMethod === 'cash'
        ? Math.max(0, safeAmountTendered - safeTotal)
        : 0;

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

      clearCart();

      return newOrder.id;
    } catch (error) {
      console.error("Checkout failed:", error);
      throw error;
    } finally {
      setIsCheckingOut(false);
    }
  };

  const updateCart = (newCart: ExtendedCart) => {
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
      updateCart,
      holdOrder,
      retrieveHeldOrder,
      heldOrders,
      deleteHeldOrder,
      voidItem,
      voidOrder
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
