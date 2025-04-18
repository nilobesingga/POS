import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    parseCurrencyInput,
    parseCurrencyToNumber,
    convertCurrency,
    validateCurrencyFormat,
    formatCurrencyInput,
    isValidAmount,
    roundCurrency
} from '../lib/currency-utils';

const mockStoreSettings = {
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

describe('Currency Utilities', () => {
    describe('formatCurrency', () => {
        it('should format number with currency symbol before', () => {
            expect(formatCurrency(1234.56, mockStoreSettings)).toBe('$1,234.56');
        });

        it('should format number with currency symbol after', () => {
            expect(formatCurrency(1234.56, {
                ...mockStoreSettings,
                currencySymbolPosition: 'after'
            })).toBe('1,234.56$');
        });

        it('should handle zero', () => {
            expect(formatCurrency(0, mockStoreSettings)).toBe('$0.00');
        });

        it('should handle string input', () => {
            expect(formatCurrency('1234.56', mockStoreSettings)).toBe('$1,234.56');
        });
    });

    describe('parseCurrencyInput', () => {
        it('should clean currency string', () => {
            expect(parseCurrencyInput('$1,234.56', mockStoreSettings)).toBe('1234.56');
        });

        it('should handle different decimal separator', () => {
            expect(parseCurrencyInput('1.234,56', {
                ...mockStoreSettings,
                decimalSeparator: ',',
                thousandsSeparator: '.'
            })).toBe('1234.56');
        });
    });

    describe('parseCurrencyToNumber', () => {
        it('should convert currency string to number', () => {
            expect(parseCurrencyToNumber('$1,234.56', mockStoreSettings)).toBe(1234.56);
        });

        it('should return 0 for invalid input', () => {
            expect(parseCurrencyToNumber('invalid', mockStoreSettings)).toBe(0);
        });
    });

    describe('convertCurrency', () => {
        it('should convert between currencies', () => {
            const amount = 100;
            const result = convertCurrency(amount, 'USD', 'EUR');
            expect(result).toBeCloseTo(91, 1); // Using exchange rate from utils
        });

        it('should return same amount for same currency', () => {
            expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
        });
    });

    describe('validateCurrencyFormat', () => {
        it('should validate correct format', () => {
            expect(validateCurrencyFormat('1234.56', mockStoreSettings).isValid).toBe(true);
        });

        it('should reject multiple decimal separators', () => {
            const result = validateCurrencyFormat('123.45.67', mockStoreSettings);
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('Only one');
        });

        it('should check decimal places', () => {
            const result = validateCurrencyFormat('123.456', mockStoreSettings);
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('decimal places');
        });
    });

    describe('formatCurrencyInput', () => {
        it('should format input in real-time', () => {
            expect(formatCurrencyInput('1234.56', mockStoreSettings)).toBe('$1,234.56');
        });

        it('should handle negative values when allowed', () => {
            expect(formatCurrencyInput('-1234.56', mockStoreSettings, { allowNegative: true }))
                .toBe('-$1,234.56');
        });
    });

    describe('isValidAmount', () => {
        it('should validate amount within bounds', () => {
            expect(isValidAmount(100, { min: 0, max: 1000 })).toBe(true);
        });

        it('should reject amount outside bounds', () => {
            expect(isValidAmount(2000, { min: 0, max: 1000 })).toBe(false);
        });
    });

    describe('roundCurrency', () => {
        it('should round to specified decimal places', () => {
            expect(roundCurrency(123.456, mockStoreSettings)).toBe(123.46);
        });

        it('should handle zero decimal places', () => {
            expect(roundCurrency(123.456, { ...mockStoreSettings, decimalPlaces: 0 })).toBe(123);
        });
    });

    describe('safeCurrencyMath', () => {
        describe('add', () => {
            it('should add two numbers correctly', () => {
                expect(safeCurrencyMath.add(10, 5)).toBe(15);
                expect(safeCurrencyMath.add(10.5, 5.3)).toBeCloseTo(15.8);
            });

            it('should handle string inputs', () => {
                expect(safeCurrencyMath.add('10', '5')).toBe(15);
                expect(safeCurrencyMath.add('10.5', '5.3')).toBeCloseTo(15.8);
            });

            it('should handle null and undefined values', () => {
                expect(safeCurrencyMath.add(null, 5)).toBe(5);
                expect(safeCurrencyMath.add(10, undefined)).toBe(10);
                expect(safeCurrencyMath.add(null, undefined)).toBe(0);
            });

            it('should handle invalid inputs', () => {
                expect(safeCurrencyMath.add('invalid', 5)).toBe(5);
                expect(safeCurrencyMath.add(10, 'invalid')).toBe(10);
                expect(safeCurrencyMath.add('invalid', 'also invalid')).toBe(0);
            });
        });

        describe('subtract', () => {
            it('should subtract two numbers correctly', () => {
                expect(safeCurrencyMath.subtract(10, 5)).toBe(5);
                expect(safeCurrencyMath.subtract(10.5, 5.3)).toBeCloseTo(5.2);
            });

            it('should handle string inputs', () => {
                expect(safeCurrencyMath.subtract('10', '5')).toBe(5);
                expect(safeCurrencyMath.subtract('10.5', '5.3')).toBeCloseTo(5.2);
            });

            it('should handle null and undefined values', () => {
                expect(safeCurrencyMath.subtract(null, 5)).toBe(-5);
                expect(safeCurrencyMath.subtract(10, undefined)).toBe(10);
                expect(safeCurrencyMath.subtract(null, undefined)).toBe(0);
            });

            it('should handle invalid inputs', () => {
                expect(safeCurrencyMath.subtract('invalid', 5)).toBe(-5);
                expect(safeCurrencyMath.subtract(10, 'invalid')).toBe(10);
                expect(safeCurrencyMath.subtract('invalid', 'also invalid')).toBe(0);
            });
        });

        describe('multiply', () => {
            it('should multiply two numbers correctly', () => {
                expect(safeCurrencyMath.multiply(10, 5)).toBe(50);
                expect(safeCurrencyMath.multiply(10.5, 2)).toBe(21);
            });

            it('should handle string inputs', () => {
                expect(safeCurrencyMath.multiply('10', '5')).toBe(50);
                expect(safeCurrencyMath.multiply('10.5', '2')).toBe(21);
            });

            it('should handle null and undefined values', () => {
                expect(safeCurrencyMath.multiply(null, 5)).toBe(0);
                expect(safeCurrencyMath.multiply(10, undefined)).toBe(0);
                expect(safeCurrencyMath.multiply(null, undefined)).toBe(0);
            });

            it('should handle invalid inputs', () => {
                expect(safeCurrencyMath.multiply('invalid', 5)).toBe(0);
                expect(safeCurrencyMath.multiply(10, 'invalid')).toBe(0);
                expect(safeCurrencyMath.multiply('invalid', 'also invalid')).toBe(0);
            });
        });

        describe('divide', () => {
            it('should divide two numbers correctly', () => {
                expect(safeCurrencyMath.divide(10, 5)).toBe(2);
                expect(safeCurrencyMath.divide(10.5, 2)).toBe(5.25);
            });

            it('should handle string inputs', () => {
                expect(safeCurrencyMath.divide('10', '5')).toBe(2);
                expect(safeCurrencyMath.divide('10.5', '2')).toBe(5.25);
            });

            it('should handle null and undefined values', () => {
                expect(safeCurrencyMath.divide(null, 5)).toBe(0);
                expect(safeCurrencyMath.divide(10, undefined)).toBe(0);
                expect(safeCurrencyMath.divide(null, undefined)).toBe(0);
            });

            it('should handle invalid inputs', () => {
                expect(safeCurrencyMath.divide('invalid', 5)).toBe(0);
                expect(safeCurrencyMath.divide(10, 'invalid')).toBe(0);
                expect(safeCurrencyMath.divide('invalid', 'also invalid')).toBe(0);
            });

            it('should prevent division by zero', () => {
                expect(safeCurrencyMath.divide(10, 0)).toBe(0);
            });
        });
    });
});
