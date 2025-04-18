import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider } from '../context/cart-context';
import { AuthProvider } from '../context/auth-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CartSection from '../components/cart-section';
import PaymentModal from '../components/payment-modal';

// Mock cart context
vi.mock('../context/cart-context', () => ({
  ...vi.importActual('../context/cart-context'),
  useCart: () => ({
    cart: {
      items: [],
      total: 99.99,
      subtotal: 92.49,
      tax: 7.50,
      discount: 0
    },
    addItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    updateQuantity: vi.fn()
  }),
  CartProvider: ({ children }) => <>{children}</>
}));

// Mock store settings
const mockUserStore = {
  currencyCode: 'USD',
  currencySymbol: '$',
  currencySymbolPosition: 'before',
  decimalSeparator: '.',
  thousandsSeparator: ',',
  decimalPlaces: 2,
  id: 1,
  name: 'Test Store',
  taxRate: '8.25'
};

// Mock auth context
vi.mock('../context/auth-context', () => ({
  useAuth: () => ({
    userStore: mockUserStore
  }),
  AuthProvider: ({ children }) => <>{children}</>
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

describe('Currency Integration Tests', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  describe('Cart Section', () => {
    it('should format item prices correctly', () => {
      const { container } = render(<CartSection />, { wrapper });

      // Verify subtotal formatting
      expect(container).toHaveTextContent('$92.49');
      // Verify total formatting
      expect(container).toHaveTextContent('$99.99');
    });

    it('should format total with correct currency symbol position', () => {
      const customWrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider value={{
            userStore: {
              ...mockUserStore,
              currencySymbolPosition: 'after'
            }
          }}>
            <CartProvider>
              {children}
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      );

      const { container } = render(<CartSection />, { wrapper: customWrapper });

      // Verify currency symbol position
      expect(container).toHaveTextContent('92.49$');
      expect(container).toHaveTextContent('99.99$');
    });
  });

  describe('Payment Modal', () => {
    it('should handle currency input correctly', async () => {
      const user = userEvent.setup();

      render(<PaymentModal isOpen={true} onClose={() => {}} />, { wrapper });

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '100.00');

      expect(amountInput).toHaveValue('$100.00');
    });

    it('should calculate change with proper currency formatting', async () => {
      const user = userEvent.setup();

      render(
        <PaymentModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper }
      );

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '120.00');

      expect(screen.getByText(/change/i)).toHaveTextContent('$20.01');
    });

    it('should handle different currency symbol positions', () => {
      const customWrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider value={{
            userStore: {
              ...mockUserStore,
              currencySymbolPosition: 'after'
            }
          }}>
            <CartProvider>
              {children}
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      );

      render(
        <PaymentModal
          isOpen={true}
          onClose={() => {}}
        />,
        { wrapper: customWrapper }
      );

      expect(screen.getByText(/total/i)).toHaveTextContent('99.99$');
    });
  });

  describe('PaymentModal', () => {
    describe('currency formatting', () => {
      it('formats prices in payment modal correctly', () => {
        // Mock cart context with required values
        const mockCart = {
          items: [],
          subtotal: 99.99,
          tax: 0,
          discount: 0,
          total: 99.99
        };

        const customWrapper = ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <AuthProvider value={{
              isAuthenticated: true,
              user: { id: 1, displayName: 'Test User' },
              login: () => {},
              logout: () => {}
            }}>
              <CartProvider initialCart={mockCart}>
                {children}
              </CartProvider>
            </AuthProvider>
          </QueryClientProvider>
        );

        render(
          <PaymentModal
            isOpen={true}
            onClose={() => {}}
            onPaymentComplete={() => {}}
            cart={mockCart}
          />,
          { wrapper: customWrapper }
        );

        expect(screen.getByText(/total amount/i)).toBeInTheDocument();
        expect(screen.getByText('$99.99')).toBeInTheDocument();
      });
    });
  });
});
