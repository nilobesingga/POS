import { useAuth } from '@/context/auth-context';
import {
    formatCurrency,
    parseCurrencyInput,
    parseCurrencyToNumber,
    convertCurrency,
    getAvailableCurrencies,
    formatWithIntl,
    updateExchangeRates,
    DEFAULT_CURRENCY_SETTINGS
} from '@/lib/currency-utils';
import { StoreSettings } from '@shared/schema';
import { useMemo } from 'react';

/**
 * Hook for currency operations with enhanced null safety
 */
export function useCurrency() {
    const { userStore } = useAuth();

    // Memoize default settings to prevent unnecessary re-renders
    const defaultSettings = useMemo(() => DEFAULT_CURRENCY_SETTINGS, []);

    // Safely handle potential null userStore with fallback to defaults
    const settings = userStore || defaultSettings;

    /**
     * Format a number to a currency string using store settings
     * with comprehensive null safety
     */
    const format = (amount: number | string | null | undefined) => {
        // Handle null, undefined, or empty values
        if (amount === null || amount === undefined || amount === '') {
            return formatCurrency(0, settings);
        }

        // Handle string values that might not be numeric
        if (typeof amount === 'string') {
            const trimmed = amount.trim();
            if (trimmed === '') return formatCurrency(0, settings);

            // Try to parse the string to a number
            const parsed = parseFloat(trimmed);
            if (isNaN(parsed)) {
                console.warn(`Invalid currency value: "${amount}" - using 0 instead`);
                return formatCurrency(0, settings);
            }
            return formatCurrency(parsed, settings);
        }

        // Handle NaN values
        if (isNaN(amount)) {
            console.warn('NaN value provided to currency formatter - using 0 instead');
            return formatCurrency(0, settings);
        }

        return formatCurrency(amount, settings);
    };

    /**
     * Parse a currency string to a clean string value
     * with enhanced input validation
     */
    const parse = (value: string | null | undefined) => {
        // Handle null, undefined, or empty values
        if (value === null || value === undefined || value === '') {
            return '0';
        }

        try {
            return parseCurrencyInput(value, settings);
        } catch (error) {
            console.warn(`Error parsing currency value: ${error}`);
            return '0';
        }
    };

    /**
     * Parse a currency string to a number
     * with comprehensive error handling
     */
    const parseNumber = (value: string | null | undefined) => {
        // Handle null, undefined, or empty values
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        try {
            const result = parseCurrencyToNumber(value, settings);
            return isNaN(result) ? 0 : result;
        } catch (error) {
            console.warn(`Error converting currency to number: ${error}`);
            return 0;
        }
    };

    /**
     * Convert amount between currencies with enhanced null safety
     */
    const convert = (amount: number | string | null | undefined, fromCurrency: string, toCurrency: string) => {
        if (!fromCurrency || !toCurrency) {
            console.warn('Invalid currency codes provided for conversion');
            return typeof amount === 'number' && !isNaN(amount) ? amount : 0;
        }

        return convertCurrency(amount, fromCurrency, toCurrency);
    };

    /**
     * Format using Intl with specific currency and locale
     * with fallbacks for invalid inputs
     */
    const formatIntl = (amount: number | string | null | undefined, currency?: string | null, locale?: string) => {
        const safeCurrency = currency || settings.currencyCode;
        const safeLocale = locale || 'en-US';

        return formatWithIntl(amount, safeCurrency, safeLocale);
    };

    /**
     * Get list of available currencies for conversion
     */
    const availableCurrencies = getAvailableCurrencies();

    /**
     * Update exchange rates (e.g., from an API) with validation
     */
    const updateRates = (newRates: { [key: string]: number } | null | undefined) => {
        if (!newRates) {
            console.warn('Attempted to update exchange rates with null/undefined data');
            return;
        }

        // Filter out invalid rates
        const validRates = Object.entries(newRates).reduce((acc, [currency, rate]) => {
            if (typeof rate === 'number' && !isNaN(rate) && rate > 0) {
                acc[currency] = rate;
            } else {
                console.warn(`Invalid exchange rate for ${currency}: ${rate}`);
            }
            return acc;
        }, {} as Record<string, number>);

        updateExchangeRates(validRates);
    };

    return {
        format,
        parse,
        parseNumber,
        convert,
        formatIntl,
        availableCurrencies,
        updateRates,
        settings
    };
}
