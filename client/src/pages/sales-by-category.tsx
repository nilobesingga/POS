import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { StoreSettings, User } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useNavigationFetch } from "@/hooks/use-navigation-fetch";
import { useToast } from "@/hooks/use-toast";

// Types for category sales report
interface CategorySalesData {
  id: number;
  name: string;
  productCount: number;
  quantity: number;
  netSales: number;
  grossSales: number;
  itemsRefunded: number;
  refunds: number;
  discounts: number;
  taxes: number;
  cost: number;
  grossProfit?: number;
  margin?: number;
}

// Backend API category response structure
interface ApiCategoryData {
  categoryId: number;
  categoryName: string;
  quantity: number;
  grossSales: number;
  quantityRefunded: number;
  refundAmount: number;
  netSales: number;
  orderCount: number;
}

// Column definition type
interface ColumnDef {
  id: keyof CategorySalesData | 'actions';
  header: string;
  accessorFn?: (row: CategorySalesData) => any;
  cell?: (row: CategorySalesData) => React.ReactNode;
  show: boolean;
}

const dateRanges = [
  { value: "all", label: "All Day" },
  { value: "custom", label: "Custom Period" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" }
];

// Get date range from option
const getDateRange = (option: string) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (option) {
    case "all":
      startDate = new Date(2000, 0, 1); // Beginning of time for the system
      endDate = endOfDay(now);
      break;
    case "custom":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case "today":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case "yesterday":
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case "last7days":
      startDate = startOfDay(subDays(now, 6));
      endDate = endOfDay(now);
      break;
    case "thisMonth":
      startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      endDate = endOfDay(now);
      break;
    default: // last30days
      startDate = startOfDay(subDays(now, 29));
      endDate = endOfDay(now);
  }

  return { startDate, endDate };
};

export default function SalesByCategoryPage() {
  const { format: formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [currentCategoryPage, setCurrentCategoryPage] = useState(1);
  const [categoriesPerPage] = useState(10);

  // Column visibility state
  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: "name", header: "Category Name", show: true },
    { id: "productCount", header: "Products Count", show: true },
    { id: "grossSales", header: "Gross Sales", accessorFn: (row) => formatCurrency(row.grossSales || 0), show: true },
    { id: "itemsRefunded", header: "Items Refunded", show: false },
    { id: "refunds", header: "Refunds", accessorFn: (row) => formatCurrency(row.refunds || 0), show: false },
    { id: "discounts", header: "Discounts", accessorFn: (row) => formatCurrency(row.discounts || 0), show: false },
    { id: "netSales", header: "Net Sales", accessorFn: (row) => formatCurrency(row.netSales || 0), show: true },
    { id: "cost", header: "Cost of Goods", accessorFn: (row) => formatCurrency(row.cost || 0), show: false },
    { id: "grossProfit", header: "Gross Profit", accessorFn: (row) => formatCurrency(row.grossProfit || 0), show: false },
    { id: "margin", header: "Margin", accessorFn: (row) => row.margin ? `${(row.margin * 100).toFixed(2)}%` : "0%", show: false },
    { id: "taxes", header: "Taxes", accessorFn: (row) => formatCurrency(row.taxes || 0), show: true },
    { id: "quantity", header: "Items Sold", show: true },
  ]);

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, show: !col.show } : col
    ));
  };

  // Set document title
  document.title = "Sales by Category | POS System";

  // Calculate date range
  const { startDate, endDate } = dateRange === "custom"
    ? { startDate: customDateRange.from, endDate: customDateRange.to }
    : getDateRange(dateRange);

  // Format dates for API
  const formattedStartDate = format(startDate, "yyyy-MM-dd");
  const formattedEndDate = format(endDate, "yyyy-MM-dd");

  // Fetch stores using our custom hook
  const {
    data: stores,
    loading: isLoadingStores,
    error: storesError
  } = useNavigationFetch<StoreSettings[]>({
    fetchFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Fetch employees using our custom hook
  const {
    data: employees,
    loading: isLoadingEmployees,
    error: employeesError
  } = useNavigationFetch<User[]>({
    fetchFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    }
  });

  // Fetch sales by category data using our custom hook
  const {
    data: rawSalesData,
    loading: isLoading,
    error: salesError,
    refetch: refetchSalesData
  } = useNavigationFetch({
    fetchFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/sales-by-category?startDate=${formattedStartDate}&endDate=${formattedEndDate}&storeId=${selectedStore}`
      );
      return response.json();
    },
    deps: [formattedStartDate, formattedEndDate, selectedStore]
  });

  // Transform API data to match the expected frontend format
  const salesData = rawSalesData ? {
    ...rawSalesData,
    categories: rawSalesData.categories?.map((category: ApiCategoryData) => ({
      id: category.categoryId || 0,
      name: category.categoryName || 'Uncategorized',
      productCount: category.orderCount || 0, // Using orderCount as a proxy for productCount
      quantity: category.quantity || 0,
      grossSales: category.grossSales || 0,
      itemsRefunded: category.quantityRefunded || 0,
      refunds: category.refundAmount || 0,
      discounts: 0, // Not available in API, defaulting to 0
      netSales: category.netSales || 0,
      taxes: 0, // Not available in API, defaulting to 0
      cost: 0, // Not available in API, defaulting to 0
    })) || []
  } : null;

  // Display errors if any
  useEffect(() => {
    if (storesError) {
      toast({
        title: "Error loading stores",
        description: storesError.message,
        variant: "destructive"
      });
    }

    if (employeesError) {
      toast({
        title: "Error loading employees",
        description: employeesError.message,
        variant: "destructive"
      });
    }

    if (salesError) {
      toast({
        title: "Error loading sales data",
        description: salesError.message,
        variant: "destructive"
      });
    }
  }, [storesError, employeesError, salesError, toast]);

  // Format numbers for tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Sales by Category</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dateRange === 'custom' && (
            <div>
              <Label>Custom Period</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {customDateRange.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, "LLL dd, y")} -{" "}
                          {format(customDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(customDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                    onSelect={(range: DateRange | undefined) => {
                      if (range?.from && range?.to) {
                        setCustomDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div>
            <Label htmlFor="store">Store</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger>
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores?.map((store) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}{store.branch ? ` (${store.branch})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employee">Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Category Sales Table with Column Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales by Category</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-auto p-2">
                {columns.map(column => (
                  <div className="flex items-center space-x-2 mb-2" key={column.id}>
                    <Checkbox
                      id={`column-${column.id}`}
                      checked={column.show}
                      onCheckedChange={() => toggleColumn(column.id)}
                    />
                    <label
                      htmlFor={`column-${column.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {column.header}
                    </label>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.filter(col => col.show).map(column => (
                  <TableHead key={column.id}>{column.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {columns.filter(col => col.show).map((col, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : salesError ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(col => col.show).length} className="text-center py-4 text-red-500">
                    Failed to load category sales data
                  </TableCell>
                </TableRow>
              ) : !salesData?.categories || salesData.categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(col => col.show).length} className="text-center py-4">
                    No category sales data available for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                // Show paginated results
                salesData.categories
                  .slice(
                    (currentCategoryPage - 1) * categoriesPerPage,
                    currentCategoryPage * categoriesPerPage
                  )
                  .map((category: CategorySalesData) => (
                    <TableRow key={category.id}>
                      {columns.filter(col => col.show).map(column => (
                        <TableCell key={column.id}>
                          {column.accessorFn ? column.accessorFn(category) : category[column.id as keyof CategorySalesData]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>

          {/* Pagination for category sales table */}
          {!isLoading && !salesError && salesData?.categories && salesData.categories.length > 0 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <div className="flex w-full items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(salesData.categories.length, (currentCategoryPage - 1) * categoriesPerPage + 1)} to {Math.min(salesData.categories.length, currentCategoryPage * categoriesPerPage)} of {salesData.categories.length} categories
                </div>
                <div>
                  <nav className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentCategoryPage((page: number) => Math.max(page - 1, 1))}
                      disabled={currentCategoryPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(salesData.categories.length / categoriesPerPage) }).map((_, i) => (
                      <Button
                        key={`page-${i}`}
                        variant={currentCategoryPage === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentCategoryPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentCategoryPage((page: number) => Math.min(page + 1, Math.ceil(salesData.categories.length / categoriesPerPage)))}
                      disabled={currentCategoryPage >= Math.ceil(salesData.categories.length / categoriesPerPage)}
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
