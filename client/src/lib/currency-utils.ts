import { StoreSettings } from '@shared/schema';

// Default store settings to use when no settings are available
export const DEFAULT_CURRENCY_SETTINGS: StoreSettings = {
    currencyCode: 'PHP',
    currencySymbol: '₱',
    currencySymbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
    id: 0,
    name: 'Default Store',
    branch: null,
    address: null,
    city: null,
    state: null,
    zipCode: null,
    phone: null,
    taxRate: '0',
    logo: null,
    showLogo: true,
    showCashierName: true,
    receiptFooter: null,
    isActive: true,
    updatedAt: new Date()
};

// Supported currency codes and their exchange rates (updated periodically)
interface ExchangeRates {
    [key: string]: number;
}

let exchangeRates: ExchangeRates = {
    USD: 1.0,  // Base currency
    EUR: 0.91,
    GBP: 0.80,
    JPY: 134.50,
    CAD: 1.35,
    AUD: 1.48,
    // Add more currencies as needed
};

export function formatCurrency(amount: number | string, storeSettings: StoreSettings) {
    // Handle null, undefined, or empty string values
    if (amount === null || amount === undefined || amount === '') {
        amount = 0;
    }

    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Always treat NaN as zero to ensure consistent display
    if (isNaN(numericAmount)) return formatCurrency(0, storeSettings);

    const {
        currencySymbol,
        currencySymbolPosition,
        decimalSeparator,
        thousandsSeparator,
        decimalPlaces
    } = storeSettings;

    // Format the number with proper decimal places
    const formattedNumber = numericAmount.toFixed(decimalPlaces)
        // Replace default decimal point with custom decimal separator
        .replace('.', decimalSeparator)
        // Add thousands separator
        .replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

    // Return formatted amount with currency symbol in correct position
    return currencySymbolPosition === 'before'
        ? `${currencySymbol}${formattedNumber}`
        : `${formattedNumber}${currencySymbol}`;
}

// Global helper for formatting currency without requiring hooks
export function formatAmount(amount: number | string, storeSettings?: Partial<StoreSettings>) {
    // Use provided settings or fall back to defaults
    const settings = {
        ...DEFAULT_CURRENCY_SETTINGS,
        ...(storeSettings || {})
    } as StoreSettings;

    return formatCurrency(amount, settings);
}

export function parseCurrencyInput(value: string, storeSettings: StoreSettings): string {
    // Handle null, undefined or non-string values
    if (value === null || value === undefined) {
        return '0';
    }

    // Ensure value is a string
    const stringValue = String(value);

    const {
        decimalSeparator,
        thousandsSeparator
    } = storeSettings;

    // Remove currency symbol and thousands separator
    const cleanValue = stringValue
        .replace(new RegExp(`[^\\d${decimalSeparator}]`, 'g'), '')
        // Convert custom decimal separator back to standard decimal point
        .replace(decimalSeparator, '.');

    // Return the cleaned string value
    return cleanValue || '0'; // Return '0' if result is empty
}

export function parseCurrencyToNumber(value: string | null | undefined, storeSettings: StoreSettings): number {
    // Handle null, undefined or empty values
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    // Ensure value is a string
    const stringValue = String(value);

    const cleanValue = parseCurrencyInput(stringValue, storeSettings);
    const number = parseFloat(cleanValue);
    return isNaN(number) ? 0 : number;
}

export function convertCurrency(
    amount: number | string | null | undefined,
    fromCurrency: string,
    toCurrency: string
): number {
    // Handle null, undefined, or empty inputs
    if (amount === null || amount === undefined || amount === '') {
        amount = 0;
    }

    // Convert string to number if needed
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Handle NaN values
    if (isNaN(numericAmount)) {
        console.warn('Invalid numeric value provided to convertCurrency. Using 0.');
        return 0;
    }

    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) return numericAmount;

    // Safety check for currency codes
    const safeFromCurrency = fromCurrency || 'USD';
    const safeToCurrency = toCurrency || 'USD';

    // Check if currencies exist in our exchange rates
    if (!exchangeRates[safeFromCurrency]) {
        console.warn(`Exchange rate not found for currency: ${safeFromCurrency}. Using 1.0`);
        return numericAmount;
    }
    if (!exchangeRates[safeToCurrency]) {
        console.warn(`Exchange rate not found for currency: ${safeToCurrency}. Using 1.0`);
        return numericAmount;
    }

    // Convert to USD first (our base currency)
    const amountInUSD = safeFromCurrency === 'USD'
        ? numericAmount
        : numericAmount / exchangeRates[safeFromCurrency];

    // Convert from USD to target currency
    return safeToCurrency === 'USD'
        ? amountInUSD
        : amountInUSD * exchangeRates[safeToCurrency];
}

export function updateExchangeRates(newRates: ExchangeRates) {
    exchangeRates = { ...exchangeRates, ...newRates };
}

export function getAvailableCurrencies(): string[] {
    return Object.keys(exchangeRates);
}

// Format currency with international number format
export function formatWithIntl(
    amount: number | string | null | undefined,
    currency: string | null | undefined,
    locale: string = 'en-US'
): string {
    // Handle null, undefined, or empty amount
    if (amount === null || amount === undefined || amount === '') {
        amount = 0;
    }

    // Convert string to number if needed
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Handle NaN values
    if (isNaN(numericAmount)) {
        console.warn('Invalid numeric value provided to formatWithIntl. Using 0.');
        return formatWithIntl(0, currency, locale);
    }

    // Default to USD if currency is invalid
    const safeCurrency = currency && typeof currency === 'string' ? currency.trim() : 'USD';

    if (!safeCurrency || safeCurrency.length !== 3) {
        console.warn(`Invalid currency code provided: "${safeCurrency}". Using USD.`);
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: safeCurrency || 'USD'
        }).format(numericAmount);
    } catch (error) {
        console.warn(`Error formatting currency ${safeCurrency}: ${error}. Using USD instead.`);
        try {
            // Fallback to USD if there's an error
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: 'USD'
            }).format(numericAmount);
        } catch (fallbackError) {
            // Ultimate fallback if even USD fails
            return `$${numericAmount.toFixed(2)}`;
        }
    }
}

// Validate currency format based on store settings
export function validateCurrencyFormat(
    value: string | null | undefined,
    storeSettings: StoreSettings
): { isValid: boolean; message?: string } {
    // Handle null, undefined, or empty values
    if (value === null || value === undefined || value === '') {
        return { isValid: true }; // Empty is valid (for optional inputs)
    }

    const { decimalSeparator, decimalPlaces } = storeSettings;

    // Ensure value is a string
    const stringValue = String(value);

    // Remove currency symbol and whitespace
    const cleanValue = stringValue.replace(/[^\d.,]/g, '');

    // Empty value check after cleaning
    if (!cleanValue) {
        return { isValid: true }; // Empty value is considered valid
    }

    // Check for multiple decimal separators
    const separatorCount = (cleanValue.match(new RegExp(`\\${decimalSeparator}`, 'g')) || []).length;
    if (separatorCount > 1) {
        return {
            isValid: false,
            message: `Only one ${decimalSeparator} is allowed`
        };
    }

    // Check decimal places
    const parts = cleanValue.split(decimalSeparator);
    if (parts[1] && parts[1].length > decimalPlaces) {
        return {
            isValid: false,
            message: `Maximum ${decimalPlaces} decimal places allowed`
        };
    }

    // Validate numeric value
    const numericValue = parseCurrencyToNumber(cleanValue, storeSettings);
    if (isNaN(numericValue)) {
        return {
            isValid: false,
            message: 'Invalid number format'
        };
    }

    return { isValid: true };
}

// Format currency input in real-time as user types
export function formatCurrencyInput(
    value: string,
    storeSettings: StoreSettings,
    options: { allowNegative?: boolean } = {}
): string {
    const { currencySymbol, currencySymbolPosition, decimalSeparator } = storeSettings;

    // Remove all non-numeric characters except decimal separator and minus sign
    let cleanValue = value.replace(new RegExp(`[^\\d\\${decimalSeparator}${options.allowNegative ? '-' : ''}]`, 'g'), '');

    // Handle negative values
    const isNegative = cleanValue.startsWith('-');
    cleanValue = cleanValue.replace(/-/g, '');

    // Parse to number and format without the negative sign
    const numValue = parseCurrencyToNumber(cleanValue, storeSettings);
    if (isNaN(numValue)) return '';

    // Format the number without negative sign
    const formattedPositive = formatCurrency(numValue, storeSettings);

    // Add negative sign in the correct position if needed
    if (isNegative && options.allowNegative) {
        return currencySymbolPosition === 'before'
            ? `-${formattedPositive}`
            : `-${formattedPositive}`;
    }

    return formattedPositive;
}

// Check if value exceeds maximum safe amount
export function isValidAmount(
    value: number,
    options: { max?: number; min?: number } = {}
): boolean {
    const max = options.max ?? Number.MAX_SAFE_INTEGER;
    const min = options.min ?? Number.MIN_SAFE_INTEGER;

    return value <= max && value >= min && !isNaN(value);
}

// Round to specified decimal places considering currency settings
export function roundCurrency(
    value: number,
    storeSettings: StoreSettings
): number {
    const { decimalPlaces } = storeSettings;
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(value * multiplier) / multiplier;
}

// Safe arithmetic operations for currency values
export const safeCurrencyMath = {
    /**
     * Safely add two possibly null/undefined currency values
     */
    add: (a: number | string | null | undefined, b: number | string | null | undefined): number => {
        const numA = typeof a === 'string' ? parseFloat(a) : (a ?? 0);
        const numB = typeof b === 'string' ? parseFloat(b) : (b ?? 0);

        return (isNaN(numA) ? 0 : numA) + (isNaN(numB) ? 0 : numB);
    },

    /**
     * Safely subtract two possibly null/undefined currency values
     */
    subtract: (a: number | string | null | undefined, b: number | string | null | undefined): number => {
        const numA = typeof a === 'string' ? parseFloat(a) : (a ?? 0);
        const numB = typeof b === 'string' ? parseFloat(b) : (b ?? 0);

        return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
    },

    /**
     * Safely multiply two possibly null/undefined currency values
     */
    multiply: (a: number | string | null | undefined, b: number | string | null | undefined): number => {
        const numA = typeof a === 'string' ? parseFloat(a) : (a ?? 0);
        const numB = typeof b === 'string' ? parseFloat(b) : (b ?? 0);

        return (isNaN(numA) ? 0 : numA) * (isNaN(numB) ? 0 : numB);
    },

    /**
     * Safely divide two possibly null/undefined currency values
     * Returns 0 if divisor is 0 to prevent errors
     */
    divide: (a: number | string | null | undefined, b: number | string | null | undefined): number => {
        const numA = typeof a === 'string' ? parseFloat(a) : (a ?? 0);
        const numB = typeof b === 'string' ? parseFloat(b) : (b ?? 0);

        // Check for division by zero
        if (isNaN(numB) || numB === 0) {
            console.warn('Division by zero or NaN attempted in safeCurrencyMath.divide');
            return 0;
        }

        return (isNaN(numA) ? 0 : numA) / numB;
    },

    /**
     * Calculate percentage of a value safely
     */
    percentage: (value: number | string | null | undefined, percent: number | string | null | undefined): number => {
        return safeCurrencyMath.multiply(value, safeCurrencyMath.divide(percent, 100));
    },

    /**
     * Safely parse any input to number, returning 0 for invalid inputs
     */
    parseNumber: (value: any): number => {
        if (value === null || value === undefined || value === '') return 0;
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(num) ? 0 : num;
    }
};
