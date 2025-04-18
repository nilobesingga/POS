import { useQuery } from '@tanstack/react-query';
import { getLatestRates } from '@/lib/exchange-rates';
import { updateExchangeRates } from '@/lib/currency-utils';

export function useExchangeRates(baseCurrency: string = 'USD') {
    return useQuery({
        queryKey: ['exchangeRates', baseCurrency],
        queryFn: () => getLatestRates(baseCurrency),
        refetchInterval: 60 * 60 * 1000, // Refetch every hour
        select: (data: Record<string, number>) => {
            // Update our currency utils with the latest rates
            updateExchangeRates(data);
            return data;
        }
    });
}
