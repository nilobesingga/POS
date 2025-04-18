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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrency } from "@/hooks/use-currency";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useNavigationFetch } from "@/hooks/use-navigation-fetch";
import { useToast } from "@/hooks/use-toast";

// Types for item sales report
interface ItemSalesData {
  id: number;
  name: string;
  categoryId?: number;
  categoryName?: string;
  sku?: string;
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

interface Top5ItemData {
  id: number;
  name: string;
  categoryName?: string;
  quantity: number;
  netSales: number;
}

interface ItemTimeSeriesData {
  id: string | number;
  name: string;
  data: Array<{
    date: string;
    quantity: number;
    sales: number;
    name: string;
  }>;
}

// Column definition type
interface ColumnDef {
  id: keyof ItemSalesData | 'actions';
  header: string;
  accessorFn?: (row: ItemSalesData) => any;
  cell?: (row: ItemSalesData) => React.ReactNode;
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

export default function SalesByItemPage() {
  const { format: formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [chartType, setChartType] = useState<"line" | "pie" | "bar">("bar");
  const [timeGrouping, setTimeGrouping] = useState<"days" | "weeks">("days");
  const [currentItemPage, setCurrentItemPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Column visibility state
  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: "name", header: "Item Name", show: true },
    { id: "sku", header: "SKU", show: false },
    { id: "categoryName", header: "Category", show: true },
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
  document.title = "Sales by Item | POS System";

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

  // Fetch sales by item data using our custom hook
  const {
    data: itemsReport,
    loading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useNavigationFetch({
    fetchFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/items?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`
      );
      return response.json();
    },
    deps: [formattedStartDate, formattedEndDate, selectedStore, selectedEmployee]
  });

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

    if (itemsError) {
      toast({
        title: "Error loading sales data",
        description: itemsError.message,
        variant: "destructive"
      });
    }
  }, [storesError, employeesError, itemsError, toast]);

  // Format numbers for tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  // Process item data to include calculated fields
  const processItemData = (items: any[]) => {
    if (!items) return [];

    return items.map(item => ({
      ...item,
      grossProfit: Number(item.netSales) - Number(item.cost),
      margin: Number(item.netSales) > 0 ? (Number(item.netSales) - Number(item.cost)) / Number(item.netSales) : 0
    }));
  };

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Sales by Item</h1>

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

      {/* Graph Section for Items Sales with inline top 5 */}
      {isLoadingItems && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 Items Side Panel Loading State */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col pb-3">
                  <div className="flex justify-between items-center">
                    <div className="w-2/3">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                    <div className="text-right w-1/4">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4 ml-auto" />
                    </div>
                  </div>
                  <Skeleton className="h-1.5 w-full mt-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chart Panel Loading State */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Trend</CardTitle>
              <div>
                <Skeleton className="h-8 w-[120px]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full flex items-center justify-center bg-gray-50 rounded-md">
                <div className="text-center">
                  <Skeleton className="h-8 w-48 mx-auto mb-4" />
                  <div className="text-sm text-muted-foreground">Loading chart data...</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoadingItems && itemsError && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium mb-2">Failed to load sales data</h3>
                <p className="text-sm">There was an error loading the sales by item report. Please try again later.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoadingItems && !itemsError && (!itemsReport?.timeSeriesData || itemsReport.timeSeriesData.length === 0) && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-medium mb-2">No sales data available</h3>
                <p className="text-sm">There are no item sales recorded for the selected time period and filters.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoadingItems && !itemsError && itemsReport?.timeSeriesData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 Items Side Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {itemsReport.top5Items.map((item: Top5ItemData, index: number) => (
                <div key={item.id} className="flex flex-col border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm truncate" title={item.name}>{item.name}</p>
                      <span className="text-xs text-muted-foreground">{item.categoryName || "Uncategorized"}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(item.netSales)}</p>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} {Number(item.quantity) === 1 ? "unit" : "units"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(item.netSales / itemsReport.top5Items[0].netSales) * 100}%`,
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chart Panel */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Trend</CardTitle>
              <div className="flex gap-2">
                <Select value={chartType} onValueChange={(value) => setChartType(value as "bar" | "line" | "pie")}>
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue placeholder="Chart Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                {chartType === "line" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        type="category"
                        allowDuplicatedCategory={false}
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={formatTooltipValue}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '8px'
                        }}
                      />
                      <Legend />
                      {itemsReport?.timeSeriesData.map((item: ItemTimeSeriesData, index: number) => (
                        <Line
                          key={item.id}
                          data={item.data}
                          dataKey="sales"
                          name={item.name}
                          stroke={`hsl(${index * 60}, 70%, 50%)`}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          type="monotone"
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {chartType === "bar" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={itemsReport?.timeSeriesData.flatMap((item: ItemTimeSeriesData) => item.data)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        type="category"
                        allowDuplicatedCategory={false}
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={formatTooltipValue}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '8px'
                        }}
                      />
                      <Legend />
                      {itemsReport?.timeSeriesData.map((item: ItemTimeSeriesData, index: number) => (
                        <Bar
                          key={item.id}
                          dataKey="sales"
                          name={item.name}
                          fill={`hsl(${index * 60}, 70%, 50%)`}
                          data={item.data}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {chartType === "pie" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={itemsReport?.top5Items || []}
                        dataKey="netSales"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        fill="#8884d8"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {itemsReport?.top5Items.map((entry: Top5ItemData, index: number) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Item Sales Table with Column Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales by Item</CardTitle>
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
              {isLoadingItems ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {columns.filter(col => col.show).map((col, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : itemsError ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(col => col.show).length} className="text-center py-4 text-red-500">
                    Failed to load item sales data
                  </TableCell>
                </TableRow>
              ) : !itemsReport?.items || itemsReport.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(col => col.show).length} className="text-center py-4">
                    No item sales data available for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                // Show paginated results
                itemsReport.items
                  .slice(
                    (currentItemPage - 1) * itemsPerPage,
                    currentItemPage * itemsPerPage
                  )
                  .map((item: ItemSalesData) => (
                    <TableRow key={item.id}>
                      {columns.filter(col => col.show).map(column => (
                        <TableCell key={column.id}>
                          {column.accessorFn ? column.accessorFn(item) : item[column.id as keyof ItemSalesData]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>

          {/* Pagination for item sales table */}
          {!isLoadingItems && !itemsError && itemsReport?.items && itemsReport.items.length > 0 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <div className="flex w-full items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(itemsReport.items.length, (currentItemPage - 1) * itemsPerPage + 1)} to {Math.min(itemsReport.items.length, currentItemPage * itemsPerPage)} of {itemsReport.items.length} items
                </div>
                <div>
                  <nav className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentItemPage((page) => Math.max(page - 1, 1))}
                      disabled={currentItemPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(itemsReport.items.length / itemsPerPage) }).map((_, i) => (
                      <Button
                        key={i}
                        variant={currentItemPage === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentItemPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentItemPage((page) => Math.min(page + 1, Math.ceil(itemsReport.items.length / itemsPerPage)))}
                      disabled={currentItemPage >= Math.ceil(itemsReport.items.length / itemsPerPage)}
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
