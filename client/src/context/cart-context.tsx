import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Cart, CartItem, Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  checkout: (paymentMethod: string, amountTendered: number) => Promise<number>;
  isCheckingOut: boolean;
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
  const [cart, setCart] = useState<Cart>(defaultCart);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0.0825; // 8.25% tax rate
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = subtotal + tax - cart.discount;
    
    setCart(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  }, [cart.items, cart.discount]);
  
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
          totalPrice: Number(product.price) * newQuantity
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
          totalPrice: Number(product.price) * quantity
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
            totalPrice: item.price * quantity
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
      // Create order DTO
      const orderData = {
        order: {
          orderNumber: `ORD-${Date.now()}`,
          status: "completed",
          subtotal: cart.subtotal,
          tax: cart.tax,
          discount: cart.discount,
          total: cart.total,
          paymentMethod,
          amountTendered,
          change: amountTendered - cart.total,
          cashierId: 1, // Default user ID
        },
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
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
  
  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      checkout,
      isCheckingOut
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
