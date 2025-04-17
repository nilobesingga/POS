import { Switch, Route, useLocation } from "wouter";
import POSLayout from "@/components/pos-layout";
import POSPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import CustomersPage from "@/pages/customers";
import EmployeesPage from "@/pages/employees";
import ItemsCategoriesPage from "@/pages/items-categories";
import ItemsModifiersPage from "@/pages/items-modifiers";
import ItemsAllergensPage from "@/pages/items-allergens";
import DiscountsPage from "@/pages/discounts";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/context/auth-context";

function App() {
  const [location] = useLocation();

  // Helper function to check if we're at a specific route
  const isPath = (path: string) => location === path;

  // Check if we're at one of the main layout routes
  const isMainLayoutRoute = isPath('/') ||
    isPath('/inventory') ||
    isPath('/reports') ||
    isPath('/settings') ||
    isPath('/customers') ||
    isPath('/employees') ||
    isPath('/items/list') ||
    isPath('/items/categories') ||
    isPath('/items/modifiers') ||
    isPath('/items/allergens') ||
    isPath('/items/discounts');

  // Wrap entire app in AuthProvider
  return (
    <AuthProvider>
      {/* Login page doesn't use the main layout */}
      {isPath('/login') && <LoginPage />}

      {/* Main layout routes */}
      {isMainLayoutRoute && (
        <MainLayout location={location} />
      )}

      {/* Other routes (404) */}
      {!isMainLayoutRoute && !isPath('/login') && (
        <Switch>
          <Route component={NotFound} />
        </Switch>
      )}
    </AuthProvider>
  );
}

function MainLayout({ location }: { location: string }) {
  let currentPage;

  switch (location) {
    case "/":
      currentPage = <POSPage />;
      break;
    case "/inventory":
      currentPage = <InventoryPage />;
      break;
    case "/reports":
      currentPage = <ReportsPage />;
      break;
    case "/settings":
      currentPage = <SettingsPage />;
      break;
    case "/customers":
      currentPage = <CustomersPage />;
      break;
    case "/employees":
      currentPage = <EmployeesPage />;
      break;
    case "/items/list":
      currentPage = <InventoryPage />; // Temporarily using InventoryPage for item list
      break;
    case "/items/categories":
      currentPage = <ItemsCategoriesPage />;
      break;
    case "/items/modifiers":
      currentPage = <ItemsModifiersPage />;
      break;
    case "/items/allergens":
      currentPage = <ItemsAllergensPage />;
      break;
    case "/items/discounts":
      currentPage = <DiscountsPage />;
      break;
    default:
      currentPage = <div>404 Not Found</div>;
  }

  return <POSLayout>{currentPage}</POSLayout>;
}

export default App;
