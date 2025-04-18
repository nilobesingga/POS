import { z } from 'zod';

// Exchange rates response schema
const ExchangeRatesSchema = z.object({
    base: z.string(),
    date: z.string().optional(),
    rates: z.record(z.number()),
    success: z.boolean().optional(),
    timestamp: z.number().optional()
});

type ExchangeRatesResponse = z.infer<typeof ExchangeRatesSchema>;

const EXCHANGE_RATE_API_KEY = import.meta.env.VITE_EXCHANGE_RATE_API_KEY || '9dedd68f4b7a5aea72d06797';
// Updated to a more reliable free API endpoint
const EXCHANGE_RATE_API_URL = 'https://v6.exchangerate-api.com/v6/9dedd68f4b7a5aea72d06797/latest/PHP';

// Default exchange rates to use as fallback
const DEFAULT_RATES: Record<string, number> = {
    USD: 56.71,
    EUR: 0.85,
    GBP: 0.75,
    JPY: 110,
    CAD: 1.25,
    AUD: 1.35,
    CNY: 6.45,
    INR: 73.5,
    PHP: 1,
};

export class ExchangeRateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExchangeRateError';
    }
}

export async function fetchExchangeRates(baseCurrency: string = 'PHP'): Promise<Record<string, number>> {
    try {
        // Validate input
        const safeCurrency = (baseCurrency && typeof baseCurrency === 'string') ?
            baseCurrency.toUpperCase() : 'PHP';

        const response = await fetch(`${EXCHANGE_RATE_API_URL}?base=${safeCurrency}`);

        if (!response.ok) {
            throw new ExchangeRateError(`Failed to fetch exchange rates: ${response.statusText}`);
        }

        const data = await response.json();
        const parsed = ExchangeRatesSchema.safeParse(data);

        if (!parsed.success) {
            throw new ExchangeRateError('Invalid exchange rate data format');
        }

        // Ensure the base currency always has a value of 1
        const rates = parsed.data.rates;
        if (safeCurrency && !rates[safeCurrency]) {
            rates[safeCurrency] = 1;
        }

        return rates;
    } catch (error) {
        if (error instanceof ExchangeRateError) {
            throw error;
        }
        throw new ExchangeRateError('Failed to fetch exchange rates');
    }
}

// Cache exchange rates for 1 hour
const CACHE_DURATION = 60 * 60 * 1000;
let cachedRates: Record<string, number> | null = null;
let lastFetchTime = 0;

export async function getLatestRates(baseCurrency: string = 'PHP'): Promise<Record<string, number>> {
    const now = Date.now();

    // Normalize the base currency
    const safeCurrency = (baseCurrency && typeof baseCurrency === 'string') ?
        baseCurrency.toUpperCase() : 'PHP';

    // Return cached rates if they're still fresh
    if (cachedRates && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedRates;
    }

    try {
        const rates = await fetchExchangeRates(safeCurrency);
        cachedRates = rates;
        lastFetchTime = now;
        return rates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);

        // If we have cached rates, return them even if expired
        if (cachedRates) {
            return cachedRates;
        }

        // As a last resort, return default hardcoded rates
        return { ...DEFAULT_RATES };
    }
}
