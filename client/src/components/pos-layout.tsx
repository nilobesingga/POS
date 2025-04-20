import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import Header from "./header";
import { CartProvider } from "@/context/cart-context";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, Grid3X3 } from "lucide-react";
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { useCurrency } from '@/hooks/use-currency';
import { useToast } from "@/hooks/use-toast";

interface BottomNavItemProps {
  icon: JSX.Element;
  label: string;
  href: string;
  isActive?: boolean;
}

const BottomNavItem = ({ icon, label, href, isActive = false }: BottomNavItemProps) => {
  const [, setLocation] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLocation(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`flex flex-col items-center p-2 ${isActive ? 'text-primary' : 'text-gray-500'}`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </a>
  );
};

interface BottomNavItemWithSubmenuProps {
  icon: JSX.Element;
  label: string;
  isActive?: boolean;
}

const BottomNavItemWithSubmenu = ({ icon, label, isActive = false }: BottomNavItemWithSubmenuProps) => {
  return (
    <SheetTrigger asChild>
      <button
        className={`flex flex-col items-center p-2 ${isActive ? 'text-primary' : 'text-gray-500'}`}
      >
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </button>
    </SheetTrigger>
  );
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useCurrency();
  const { error } = useExchangeRates(settings.currencyCode);
  const { toast } = useToast();

  // Show error toast if exchange rates fail to load
  useEffect(() => {
    if (error) {
      toast({
        title: "Currency Error",
        description: "Failed to load exchange rates. Some currency conversions may be inaccurate.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [location] = useLocation();
  const [isItemsSheetOpen, setIsItemsSheetOpen] = useState(false);

  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Point of Sale";
      case "/customers":
        return "Customers";
      case "/inventory":
      case "/items":
      case "/items/list":
      case "/items/categories":
      case "/items/modifiers":
      case "/items/discounts":
        return location.includes("/items/") ?
          location.substring(location.lastIndexOf('/') + 1).charAt(0).toUpperCase() +
          location.substring(location.lastIndexOf('/') + 1).slice(1) :
          "Items";
      case "/reports":
        return "Reports";
      case "/reports/sales":
        return "Sales Summary";
      case "/reports/items":
        return "Sales by Item";
      case "/reports/categories":
        return "Sales by Category";
      case "/kitchen-queues":
        return "Kitchen Queue Management";
      case "/kitchen-orders":
        return "Kitchen Dashboard";
      case "/settings":
        return "Settings";
      default:
        return "Point of Sale";
    }
  };

  const toggleMobileNav = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  const isItemsRelatedPage =
    location === "/items" ||
    location === "/items/list" ||
    location === "/items/categories" ||
    location === "/items/modifiers" ||
    location === "/items/discounts";

  return (
    <CartProvider>
      <div className="flex flex-col md:flex-row h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <Header title={getPageTitle()} toggleMobileNav={toggleMobileNav} />

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Rendering outlet content via child components by parent App.tsx */}
            {children}
          </div>

          {/* Mobile Bottom Nav */}
          <div className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10">
            <Sheet open={isItemsSheetOpen} onOpenChange={setIsItemsSheetOpen}>
              <div className="flex justify-around">
                <BottomNavItem
                  href="/"
                  isActive={location === "/"}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  }
                  label="POS"
                />

                <BottomNavItemWithSubmenu
                  isActive={isItemsRelatedPage}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  }
                  label="Items"
                />

                <BottomNavItem
                  href="/kitchen-orders"
                  isActive={location === "/kitchen-orders" || location === "/kitchen-queues"}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  label="Kitchen"
                />

                <BottomNavItem
                  href="/customers"
                  isActive={location === "/customers"}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  label="Customers"
                />

                <BottomNavItem
                  href="/employees"
                  isActive={location === "/employees"}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                  label="Employees"
                />

                <BottomNavItem
                  href="/reports"
                  isActive={location === "/reports"}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                  label="Reports"
                />
              </div>

              <SheetContent side="bottom" className="h-72">
                <div className="px-1 py-6">
                  <h3 className="text-lg font-medium mb-4">Items Management</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { href: "/items/list", icon: <Grid3X3 className="h-8 w-8 mb-2 text-primary" />, label: "Item List" },
                      {
                        href: "/items/categories",
                        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>,
                        label: "Categories"
                      },
                      {
                        href: "/items/modifiers",
                        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>,
                        label: "Modifiers"
                      },
                      {
                        href: "/items/discounts",
                        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>,
                        label: "Discounts"
                      },
                    ].map(item => {
                      const [, setLocation] = useLocation();

                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation(item.href);
                            setIsItemsSheetOpen(false);
                          }}
                          className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50"
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </CartProvider>
  );
}
