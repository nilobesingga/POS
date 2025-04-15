import { Switch, Route, useLocation } from "wouter";
import POSLayout from "@/components/pos-layout";
import POSPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function App() {
  const [location] = useLocation();
  
  // Helper function to check if we're at a specific route
  const isPath = (path: string) => location === path;
  
  // Check if we're at one of the main layout routes
  const isMainLayoutRoute = isPath('/') || isPath('/inventory') || isPath('/reports') || isPath('/settings');
  
  // If we're at a main layout route, render the POSLayout with the appropriate page
  if (isMainLayoutRoute) {
    let currentPage;
    
    if (isPath('/')) {
      currentPage = <POSPage />;
    } else if (isPath('/inventory')) {
      currentPage = <InventoryPage />;
    } else if (isPath('/reports')) {
      currentPage = <ReportsPage />;
    } else if (isPath('/settings')) {
      currentPage = <SettingsPage />;
    }
    
    return <POSLayout>{currentPage}</POSLayout>;
  }
  
  // Otherwise, use the Switch for 404 handling
  return (
    <Switch>
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
