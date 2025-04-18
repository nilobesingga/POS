import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';

export interface FetchConfig<T> {
    // Function that performs the actual fetch operation
    fetchFn: () => Promise<T>;
    // Optional dependency array to re-trigger fetch
    deps?: any[];
    // Optional condition to determine if fetch should run
    condition?: boolean;
    // Optional callback after successful fetch
    onSuccess?: (data: T) => void;
    // Optional callback when fetch fails
    onError?: (error: Error) => void;
}

/**
 * Custom hook for handling automatic data fetching during navigation
 * This hook fetches data when a user navigates to a page and when any dependencies change
 */
export function useNavigationFetch<T>({
    fetchFn,
    deps = [],
    condition = true,
    onSuccess,
    onError
}: FetchConfig<T>): {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
} {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const [location] = useLocation();
    const previousLocation = useRef<string>(location);

    // Function to fetch data
    const fetchData = async () => {
        if (!condition) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            setData(result);
            if (onSuccess) onSuccess(result);
        } catch (err) {
            const fetchError = err instanceof Error ? err : new Error(String(err));
            setError(fetchError);
            if (onError) onError(fetchError);
        } finally {
            setLoading(false);
        }
    };

    // Refetch function that can be called manually
    const refetch = async () => {
        await fetchData();
    };

    // Effect that runs on location change or when dependencies change
    useEffect(() => {
        // Check if the location has changed or if it's the initial load
        const isLocationChanged = previousLocation.current !== location;
        previousLocation.current = location;

        // Fetch data if location changed or other dependencies changed
        fetchData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, ...deps]);

    return { data, loading, error, refetch };
}
