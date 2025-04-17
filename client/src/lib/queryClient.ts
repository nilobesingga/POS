import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
    if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
    }
}

// Function to get auth tokens from localStorage
function getAuthTokens() {
    try {
        const authData = localStorage.getItem('authData');
        if (authData) {
            const { accessToken, refreshToken } = JSON.parse(authData);
            return { accessToken, refreshToken };
        }
    } catch (error) {
        console.error('Failed to get auth tokens:', error);
    }
    return { accessToken: null, refreshToken: null };
}

// Function to refresh the access token
async function refreshToken(refreshToken: string): Promise<string | null> {
    try {
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();

        // Update localStorage with the new access token
        const authData = JSON.parse(localStorage.getItem('authData') || '{}');
        authData.accessToken = data.accessToken;
        localStorage.setItem('authData', JSON.stringify(authData));

        return data.accessToken;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

export async function apiRequest(
    method: string,
    url: string,
    data?: unknown | undefined,
    options: { headers?: Record<string, string> } = {}
): Promise<Response> {
    const { accessToken, refreshToken: refreshTokenValue } = getAuthTokens();

    // Prepare headers with auth token if available
    const headers: Record<string, string> = {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
        ...(options.headers || {})
    };

    // Make the initial request
    let response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
    });

    // If token expired (401) and we have a refresh token, try to refresh
    if (response.status === 401 && refreshTokenValue) {
        const newAccessToken = await refreshToken(refreshTokenValue);

        // If token refresh was successful, retry the original request
        if (newAccessToken) {
            headers["Authorization"] = `Bearer ${newAccessToken}`;

            response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
                credentials: "include",
            });
        }
    }

    await throwIfResNotOk(response);
    return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
    on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
    ({ on401: unauthorizedBehavior }) =>
        async ({ queryKey }) => {
            const { accessToken, refreshToken: refreshTokenValue } = getAuthTokens();

            // Prepare headers with auth token if available
            const headers: Record<string, string> =
                accessToken ? { "Authorization": `Bearer ${accessToken}` } : {};

            // Make the initial request
            let res = await fetch(queryKey[0] as string, {
                credentials: "include",
                headers
            });

            // If token expired (401) and we have a refresh token, try to refresh
            if (res.status === 401 && refreshTokenValue) {
                const newAccessToken = await refreshToken(refreshTokenValue);

                // If token refresh was successful, retry the original request
                if (newAccessToken) {
                    res = await fetch(queryKey[0] as string, {
                        credentials: "include",
                        headers: { "Authorization": `Bearer ${newAccessToken}` }
                    });
                }
            }

            if (unauthorizedBehavior === "returnNull" && res.status === 401) {
                return null;
            }

            await throwIfResNotOk(res);
            return await res.json();
        };

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            refetchInterval: false,
            refetchOnWindowFocus: false,
            staleTime: Infinity,
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});
