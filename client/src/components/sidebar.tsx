import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface NavItemProps {
  href: string;
  icon: JSX.Element;
  label: string;
  isActive?: boolean;
}

interface NavSubItemProps {
  href: string;
  label: string;
  isActive?: boolean;
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <li className={cn(
      "px-4 py-2",
      isActive
        ? "bg-blue-50 border-l-4 border-primary text-primary"
        : "hover:bg-gray-50"
    )}>
      <Link
        href={href}
        className={cn(
          "flex items-center",
          isActive
            ? "text-primary"
            : "text-gray-600 hover:text-primary"
        )}
      >
        {icon}
        <span className="ml-3 lg:block hidden">{label}</span>
      </Link>
    </li>
  );
}

interface NavItemWithSubmenuProps {
  icon: JSX.Element;
  label: string;
  children: React.ReactNode;
  isExpanded: boolean;
  toggleExpand: () => void;
  isAnyChildActive: boolean;
}

function NavItemWithSubmenu({ icon, label, children, isExpanded, toggleExpand, isAnyChildActive }: NavItemWithSubmenuProps) {
  return (
    <li>
      <div
        className={cn(
          "px-4 py-2 cursor-pointer",
          isAnyChildActive
            ? "bg-blue-50 border-l-4 border-primary text-primary"
            : "hover:bg-gray-50"
        )}
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {icon}
            <span className="ml-3 lg:block hidden">{label}</span>
          </div>
          <div className="lg:block hidden">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <ul className="pl-10 lg:pl-8 py-1">
          {children}
        </ul>
      )}
    </li>
  );
}

function NavSubItem({ href, label, isActive }: NavSubItemProps) {
  return (
    <li className={cn(
      "py-2",
      isActive
        ? "text-primary"
        : "text-gray-600"
    )}>
      <Link
        href={href}
        className={cn(
          "text-sm",
          isActive
            ? "text-primary"
            : "text-gray-600 hover:text-primary"
        )}
      >
        {label}
      </Link>
    </li>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const isItemsRelatedPage =
    location === "/items" ||
    location === "/items/list" ||
    location === "/items/categories" ||
    location === "/items/modifiers" ||
    location === "/items/discounts" ||
    location === "/items/allergens";

  return (
    <div className="hidden md:flex md:w-16 lg:w-64 bg-white shadow-md flex-shrink-0 flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary lg:block hidden">POS System</h1>
        <div className="lg:hidden flex justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <nav className="flex-1 py-4">
        <ul>
          <NavItem
            href="/"
            isActive={location === "/"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            label="Point of Sale"
          />

          <NavItemWithSubmenu
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
            label="Items"
            isExpanded={itemsExpanded}
            toggleExpand={() => setItemsExpanded(!itemsExpanded)}
            isAnyChildActive={isItemsRelatedPage}
          >
            <NavSubItem
              href="/items/list"
              label="Item List"
              isActive={location === "/items/list"}
            />
            <NavSubItem
              href="/items/categories"
              label="Categories"
              isActive={location === "/items/categories"}
            />
            <NavSubItem
              href="/items/modifiers"
              label="Modifiers"
              isActive={location === "/items/modifiers"}
            />
            <NavSubItem
              href="/items/allergens"
              label="Allergens"
              isActive={location === "/items/allergens"}
            />
            <NavSubItem
              href="/items/discounts"
              label="Discounts"
              isActive={location === "/items/discounts"}
            />
          </NavItemWithSubmenu>

          <NavItem
            href="/customers"
            isActive={location === "/customers"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            label="Customers"
          />

          <NavItem
            href="/employees"
            isActive={location === "/employees"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            label="Employees"
          />

          <NavItem
            href="/reports"
            isActive={location === "/reports"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            label="Reports"
          />

          <NavItem
            href="/settings"
            isActive={location === "/settings"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            label="Settings"
          />
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
            <span className="font-bold">{user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : '?'}</span>
          </div>
          <div className="ml-3 lg:block hidden">
            <p className="text-sm font-medium">{user?.displayName || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'Guest'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
