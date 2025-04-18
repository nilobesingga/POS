import { Route, Switch, useLocation } from "wouter";
import POSLayout from "@/components/pos-layout";
import POSPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import SalesSummaryPage from "@/pages/sales-summary";
import SalesByItemPage from "@/pages/sales-by-item";
import SalesByCategoryPage from "@/pages/sales-by-category";
import SalesByEmployeePage from "@/pages/sales-by-employee";
import SalesByPaymentPage from "@/pages/sales-by-payment";
import ReceiptsPage from "@/pages/receipts";
import SalesByModifierPage from "@/pages/sales-by-modifier";
import DiscountsReportPage from "@/pages/discounts-report";
import TaxReportPage from "@/pages/tax-report";
import ShiftsReportPage from "@/pages/shifts-report";
import ShiftManagementPage from "@/pages/shift-management";
import SettingsPage from "@/pages/settings";
import CustomersPage from "@/pages/customers";
import EmployeesPage from "@/pages/employees";
import ItemsCategoriesPage from "@/pages/items-categories";
import ItemsModifiersPage from "@/pages/items-modifiers";
import ItemsAllergensPage from "@/pages/items-allergens";
import DiscountsPage from "@/pages/discounts";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { RouteGuard } from "@/components/ui/route-guard";
import { RolePermissions } from "@shared/schema";

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <Routes />
          <Toaster />
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

function Routes() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        <LoginPage />
      </Route>

      {/* Protected routes with minimal permission requirements */}
      <Route path="/">
        <POSLayout>
          <RouteGuard requiredPermission="canManageOrders">
            <POSPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/pos">
        <POSLayout>
          <RouteGuard requiredPermission="canManageOrders">
            <POSPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      {/* Routes requiring product management permission */}
      <Route path="/inventory">
        <POSLayout>
          <RouteGuard requiredPermission="canManageProducts">
            <InventoryPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      {/* Routes requiring report viewing permission */}
      <Route path="/reports/sales">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <SalesSummaryPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/items">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <SalesByItemPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/categories">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <SalesByCategoryPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/employees">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <SalesByEmployeePage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/sales-by-payment">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <SalesByPaymentPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/receipts">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <ReceiptsPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/sales-by-modifier">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <SalesByModifierPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/discounts">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <DiscountsReportPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/tax-report">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <TaxReportPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports/shifts-report">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <ShiftsReportPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/shift-management">
        <POSLayout>
          <RouteGuard requiredPermission="canManageOrders">
            <ShiftManagementPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/reports">
        <POSLayout>
          <RouteGuard requiredPermission="canViewReports">
            <SalesSummaryPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/settings">
        <POSLayout>
          <RouteGuard requiredPermission="canManageSettings">
            <SettingsPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/customers">
        <POSLayout>
          <RouteGuard requiredPermission={["canManageCustomers", "canViewCustomers"]}>
            <CustomersPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/employees">
        <POSLayout>
          <RouteGuard requiredPermission="canManageUsers">
            <EmployeesPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/items/list">
        <POSLayout>
          <RouteGuard requiredPermission="canManageProducts">
            <InventoryPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/items/categories">
        <POSLayout>
          <RouteGuard requiredPermission="canManageCategories">
            <ItemsCategoriesPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/items/modifiers">
        <POSLayout>
          <RouteGuard requiredPermission="canManageProducts">
            <ItemsModifiersPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/items/allergens">
        <POSLayout>
          <RouteGuard requiredPermission="canManageProducts">
            <ItemsAllergensPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route path="/items/discounts">
        <POSLayout>
          <RouteGuard requiredPermission="canManageProducts">
            <DiscountsPage />
          </RouteGuard>
        </POSLayout>
      </Route>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

export default App;
