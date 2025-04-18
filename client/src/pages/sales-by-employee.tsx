// filepath: /Applications/MAMP/htdocs/Loyverse/client/src/pages/sales-by-employee.tsx
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
  BarChart,
  Bar
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useNavigationFetch } from "@/hooks/use-navigation-fetch";
import { useToast } from "@/hooks/use-toast";

// Types for employee sales report
interface EmployeeSalesData {
  id: number;
  name: string;
  email: string;
  grossSales: number;
  refunds: number;
  discounts: number;
  netSales: number;
  receipts: number;
  avgSale: number;
  customersSignedUp: number;
}

interface TimeSeriesPoint {
  date: string;
  grossSales: number;
  receipts: number;
  name: string;
}

interface TimeSeriesData {
  id: string | number;
  name: string;
  data: TimeSeriesPoint[];
}

interface EmployeeReportData {
  startDate: string;
  endDate: string;
  employees: EmployeeSalesData[];
  top5Employees: EmployeeSalesData[];
  timeSeriesData: TimeSeriesData[];
  totalGrossSales: number;
  totalNetSales: number;
}

// Column definition type
interface ColumnDef {
  id: keyof EmployeeSalesData | 'actions';
  header: string;
  accessorFn?: (row: EmployeeSalesData) => any;
  cell?: (row: EmployeeSalesData) => React.ReactNode;
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

export default function SalesByEmployeePage() {
  const { format: formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [currentEmployeePage, setCurrentEmployeePage] = useState(1);
  const [employeesPerPage] = useState(10);
  const [chartType, setChartType] = useState<"line" | "bar">("bar");
  const [chartMetric, setChartMetric] = useState<"grossSales" | "receipts">("grossSales");

  // Column visibility state
  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: "name", header: "Name", show: true },
    { id: "grossSales", header: "Gross Sales", accessorFn: (row) => formatCurrency(row.grossSales || 0), show: true },
    { id: "refunds", header: "Refunds", accessorFn: (row) => formatCurrency(row.refunds || 0), show: true },
    { id: "discounts", header: "Discounts", accessorFn: (row) => formatCurrency(row.discounts || 0), show: true },
    { id: "netSales", header: "Net Sales", accessorFn: (row) => formatCurrency(row.netSales || 0), show: true },
    { id: "receipts", header: "Receipts", show: true },
    { id: "avgSale", header: "Average Sale", accessorFn: (row) => formatCurrency(row.avgSale || 0), show: true },
    { id: "customersSignedUp", header: "Customers Signed Up", show: true },
  ]);

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, show: !col.show } : col
    ));
  };

  // Set document title
  document.title = "Sales by Employee | POS System";

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

  // Fetch sales by employee data using our custom hook
  const {
    data: salesData,
    loading: isLoading,
    error: salesError,
    refetch: refetchSalesData
  } = useNavigationFetch<EmployeeReportData>({
    fetchFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/employees?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}`
      );
      return response.json();
    },
    deps: [formattedStartDate, formattedEndDate, selectedStore]
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

    if (salesError) {
      toast({
        title: "Error loading sales data",
        description: salesError.message,
        variant: "destructive"
      });
    }
  }, [storesError, salesError, toast]);

  // Format numbers for tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!salesData?.timeSeriesData) return [];

    // Transform the time series data for the chart
    // Add index signature to allow dynamic string keys
    const transformedData: { date: string; [key: string]: string | number }[] = [];

    salesData.timeSeriesData.forEach(employeeData => {
      employeeData.data.forEach(dataPoint => {
        const existingDay = transformedData.find(d => d.date === dataPoint.date);

        if (existingDay) {
          existingDay[employeeData.name] = dataPoint[chartMetric];
        } else {
          const newDay = { date: dataPoint.date } as { date: string; [key: string]: string | number };
          newDay[employeeData.name] = dataPoint[chartMetric];
          transformedData.push(newDay);
        }
      });
    });

    return transformedData.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const chartData = prepareChartData();

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Sales by Employee</h1>

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
            <Label htmlFor="chartMetric">Chart Metric</Label>
            <Select value={chartMetric} onValueChange={setChartMetric as any}>
              <SelectTrigger>
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grossSales">Gross Sales</SelectItem>
                <SelectItem value="receipts">Receipts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full flex items-center justify-center bg-gray-50 rounded-md">
              <div className="text-center">
                <Skeleton className="h-8 w-48 mx-auto mb-4" />
                <div className="text-sm text-muted-foreground">Loading chart data...</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : salesError ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Failed to load sales data</h3>
              <p className="text-sm">There was an error loading the sales by employee report. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !salesData?.timeSeriesData || salesData.timeSeriesData.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-medium mb-2">No sales data available</h3>
              <p className="text-sm">There are no employee sales recorded for the selected time period and filters.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 Employees Side Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Employees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {salesData.top5Employees.map((employee, index) => (
                <div key={employee.id} className="flex flex-col border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm truncate" title={employee.name}>{employee.name}</p>
                      <span className="text-xs text-muted-foreground">{employee.receipts} receipts</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(employee.netSales)}</p>
                      <span className="text-xs text-muted-foreground">
                        Avg: {formatCurrency(employee.avgSale)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(employee.netSales / salesData.top5Employees[0].netSales) * 100}%`,
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
              <CardTitle>Performance Trend</CardTitle>
              <div className="flex gap-2">
                <Select value={chartType} onValueChange={(value) => setChartType(value as "bar" | "line")}>
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue placeholder="Chart Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                {chartType === "line" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={chartMetric === "grossSales" ? formatTooltipValue : undefined}
                      />
                      <Tooltip
                        formatter={(value, name) =>
                          chartMetric === "grossSales" ? [formatCurrency(value as number), name] : [value, name]
                        }
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '8px'
                        }}
                      />
                      <Legend />
                      {salesData.timeSeriesData.map((employee, index) => (
                        <Line
                          key={employee.id}
                          type="monotone"
                          dataKey={employee.name}
                          stroke={`hsl(${index * 60}, 70%, 50%)`}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {chartType === "bar" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={chartMetric === "grossSales" ? formatTooltipValue : undefined}
                      />
                      <Tooltip
                        formatter={(value, name) =>
                          chartMetric === "grossSales" ? [formatCurrency(value as number), name] : [value, name]
                        }
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '8px'
                        }}
                      />
                      <Legend />
                      {salesData.timeSeriesData.map((employee, index) => (
                        <Bar
                          key={employee.id}
                          dataKey={employee.name}
                          fill={`hsl(${index * 60}, 70%, 50%)`}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Sales Table with Column Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales by Employee</CardTitle>
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
                    Failed to load employee sales data
                  </TableCell>
                </TableRow>
              ) : !salesData?.employees || salesData.employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(col => col.show).length} className="text-center py-4">
                    No employee sales data available for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                // Show paginated results
                salesData.employees
                  .slice(
                    (currentEmployeePage - 1) * employeesPerPage,
                    currentEmployeePage * employeesPerPage
                  )
                  .map((employee: EmployeeSalesData) => (
                    <TableRow key={employee.id}>
                      {columns.filter(col => col.show).map(column => (
                        <TableCell key={column.id}>
                          {column.accessorFn ? column.accessorFn(employee) : employee[column.id as keyof EmployeeSalesData]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>

          {/* Pagination for employee sales table */}
          {!isLoading && !salesError && salesData?.employees && salesData.employees.length > 0 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <div className="flex w-full items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(salesData.employees.length, (currentEmployeePage - 1) * employeesPerPage + 1)} to {Math.min(salesData.employees.length, currentEmployeePage * employeesPerPage)} of {salesData.employees.length} employees
                </div>
                <div>
                  <nav className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentEmployeePage((page) => Math.max(page - 1, 1))}
                      disabled={currentEmployeePage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(salesData.employees.length / employeesPerPage) }).map((_, i) => (
                      <Button
                        key={i}
                        variant={currentEmployeePage === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentEmployeePage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentEmployeePage((page) => Math.min(page + 1, Math.ceil(salesData.employees.length / employeesPerPage)))}
                      disabled={currentEmployeePage >= Math.ceil(salesData.employees.length / employeesPerPage)}
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
