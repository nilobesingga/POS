import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
    Home,
    ShoppingBag,
    BarChart2,
    Settings,
    Users,
    Package,
    Percent,
    ChevronDown,
    Coffee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { RolePermissions } from '@shared/schema';

interface SidebarProps {
    className?: string;
}

interface MenuItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    permission: keyof RolePermissions;
    subItems?: { name: string; href: string; }[];
}

export function Sidebar({ className }: SidebarProps) {
    const [location] = useLocation();
    const { user } = useAuth();
    const { hasPermission, isLoading } = usePermissions();
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    const [, setLocation] = useLocation();

    // Define menuItems structure
    const menuItems: MenuItem[] = [
        {
            name: 'POS',
            href: '/',
            icon: Home,
            permission: 'canManageOrders'
        },
        {
            name: 'Inventory',
            href: '/inventory',
            icon: Package,
            permission: 'canManageProducts',
            subItems: [
                { name: 'Items', href: '/inventory' },
                { name: 'Categories', href: '/items/categories' },
                { name: 'Modifiers', href: '/items/modifiers' },
                { name: 'Allergens', href: '/items/allergens' }
            ]
        },
        {
            name: 'Kitchen',
            href: '/kitchen-queues',
            icon: Coffee,
            permission: 'canManageOrders',
            subItems: [
                { name: 'Queue Management', href: '/kitchen-queues' },
                { name: 'Kitchen Dashboard', href: '/kitchen-orders' }
            ]
        },
        {
            name: 'Reports',
            href: '/reports',
            icon: BarChart2,
            permission: 'canViewReports',
            subItems: [
                { name: 'Sales Summary', href: '/reports/sales' },
                { name: 'Sales by Item', href: '/reports/items' },
                { name: 'Sales by Category', href: '/reports/categories' },
                { name: 'Sales by Employee', href: '/reports/employees' },
                { name: 'Sales by Payment Type', href: '/reports/sales-by-payment' },
                { name: 'Receipts', href: '/reports/receipts' },
                { name: 'Sales by Modifier', href: '/reports/sales-by-modifier' },
                { name: 'Tax', href: '/reports/tax-report' },
                { name: 'Discounts', href: '/reports/discounts' },
                { name: 'Shift', href: '/reports/shifts-report' }
            ]
        },
        {
            name: 'Customers',
            href: '/customers',
            icon: Users,
            permission: 'canManageCustomers'
        },
        {
            name: 'Employees',
            href: '/employees',
            icon: Users,
            permission: 'canManageUsers'
        },
        {
            name: 'Discounts',
            href: '/items/discounts',
            icon: Percent,
            permission: 'canManageProducts'
        },
        {
            name: 'Settings',
            href: '/settings',
            icon: Settings,
            permission: 'canManageSettings',
            // subItems: [
            //     { name: 'Store Settings', href: '/settings' },
            //     { name: 'POS Devices', href: '/settings/devices' },
            //     { name: 'Tax Categories', href: '/settings/taxes' },
            //     { name: 'Payment Types', href: '/settings/payments' },
            //     { name: 'Dining Options', href: '/settings/dining' }
            // ]
        }
    ];

    // Handle menu expansion
    const handleMenuClick = (e: React.MouseEvent, menuName: string, hasSubItems: boolean, href: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (hasSubItems) {
            setExpandedMenu(expandedMenu === menuName ? null : menuName);
        } else {
            setLocation(href);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className={cn('pb-12 min-h-screen bg-gray-50 border-r', className)}>
            <div className="space-y-4 py-4">
                <div className="px-4 py-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                        Loyverse POS
                    </h2>
                </div>
                <div className="px-3">
                    {isLoading ? (
                        <div className="flex flex-col gap-2 px-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-9 w-full rounded-md bg-gray-200 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <nav className="space-y-1">
                            {menuItems.map((item) => {
                                const isAdmin = user.role === 'admin';
                                const canAccess = isAdmin || hasPermission(item.permission);

                                if (!canAccess) return null;

                                const isActive = location === item.href ||
                                    (item.subItems && item.subItems.some(sub => location === sub.href));

                                return (
                                    <div key={item.href}>
                                        <a
                                            href={item.href}
                                            onClick={(e) => handleMenuClick(e, item.name, !!item.subItems, item.href)}
                                            className={cn(
                                                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all',
                                                isActive
                                                    ? 'bg-gray-200 text-gray-900'
                                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                            )}
                                        >
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.name}</span>
                                            {item.subItems && (
                                                <ChevronDown
                                                    className={cn(
                                                        'ml-auto h-4 w-4 transition-transform',
                                                        expandedMenu === item.name ? 'transform rotate-180' : ''
                                                    )}
                                                />
                                            )}
                                        </a>
                                        {item.subItems && expandedMenu === item.name && (
                                            <div className="ml-6 mt-1 space-y-1">
                                                {item.subItems.map((subItem) => (
                                                    <a
                                                        key={subItem.href}
                                                        href={subItem.href}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setLocation(subItem.href);
                                                        }}
                                                        className={cn(
                                                            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all',
                                                            location === subItem.href
                                                                ? 'bg-gray-200 text-gray-900'
                                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                                        )}
                                                    >
                                                        {subItem.name}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    )}
                </div>
            </div>
        </div>
    );
}
