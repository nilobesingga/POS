import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './client/src')
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./client/src/__tests__/setup.ts'],
        include: [
            './client/src/__tests__/currency-utils.test.ts',
            './client/src/__tests__/currency-integration.test.tsx',
            './client/src/__tests__/use-currency.test.tsx'
        ]
    }
});
