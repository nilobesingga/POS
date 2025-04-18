import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useCurrency } from '../hooks/use-currency';
import { useExchangeRates } from '../hooks/use-exchange-rates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/auth-context';
import React from 'react';

// Mock exchange rates API response
const mockExchangeRates = {
  USD: 1.0,
  EUR: 0.91,
  GBP: 0.80,
  JPY: 134.50
};

// Mock fetch globally
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      timestamp: Date.now(),
      base: 'USD',
      rates: mockExchangeRates
    })
  })
);

// Mock store settings from auth context
const mockUserStore = {
  currencyCode: 'USD',
  currencySymbol: '$',
  currencySymbolPosition: 'before',
  decimalSeparator: '.',
  thousandsSeparator: ',',
  decimalPlaces: 2,
  id: 1,
  name: 'Test Store',
  branch: null,
  address: null,
  city: null,
  state: null,
  zipCode: null,
  phone: null,
  taxRate: '8.25',
  logo: null,
  showLogo: true,
  showCashierName: true,
  receiptFooter: null,
  isActive: true,
  updatedAt: new Date()
};

// Mock auth context
vi.mock('../context/auth-context', () => ({
  useAuth: () => ({
    userStore: mockUserStore
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0
    }
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

describe('Currency Hooks', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  describe('useCurrency', () => {
    it('should provide currency formatting utilities', () => {
      const { result } = renderHook(() => useCurrency(), { wrapper });

      expect(result.current.format).toBeDefined();
      expect(result.current.parse).toBeDefined();
      expect(result.current.parseNumber).toBeDefined();
      expect(result.current.convert).toBeDefined();
      expect(result.current.formatIntl).toBeDefined();
    });

    it('should format currency correctly', () => {
      const { result } = renderHook(() => useCurrency(), { wrapper });
      expect(result.current.format(1234.56)).toBe('$1,234.56');
    });

    it('should parse currency string correctly', () => {
      const { result } = renderHook(() => useCurrency(), { wrapper });
      expect(result.current.parse('$1,234.56')).toBe('1234.56');
    });

    it('should convert between currencies', () => {
      const { result } = renderHook(() => useCurrency(), { wrapper });
      const converted = result.current.convert(100, 'USD', 'EUR');
      expect(converted).toBeCloseTo(91, 1);
    });
  });

  describe('useExchangeRates', () => {
    it('should fetch exchange rates', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useExchangeRates(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitForNextUpdate();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockExchangeRates);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('base=USD'));
    });

    it('should handle fetch errors', async () => {
      // Mock a failed fetch
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.reject(new Error('Failed to fetch'))
      );

      const { result, waitForNextUpdate } = renderHook(() => useExchangeRates(), { wrapper });

      await waitForNextUpdate();

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });

    it('should use provided base currency', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useExchangeRates('EUR'), { wrapper });

      await waitForNextUpdate();

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('base=EUR'));
    });
  });
});
