import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useLocation } from "wouter";

// Types for item sales report
interface ItemSalesData {
  id: number;
  name: string;
  categoryId?: number;
  categoryName?: string;
  quantity: number;
  grossSales: number; // Add grossSales property
  netSales: number;
  taxes: number;
  cost: number;
}

interface Top5ItemData {
  id: number;
  name: string;
  categoryName?: string;
  quantity: number;
  grossSales: number; // Add grossSales property
  netSales: number;
}

interface ItemTimeSeriesPoint {
  date: string;
  quantity: number;
  sales: number;
  name: string;
}

interface ItemTimeSeriesData {
  id: string | number;
  name: string;
  data: ItemTimeSeriesPoint[];
}

interface ItemsReportData {
  startDate: string;
  endDate: string;
  items: ItemSalesData[];
  top5Items: Top5ItemData[];
  timeSeriesData: ItemTimeSeriesData[];
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

export function ReportsPage({ activeTabProp = "sales" }: { activeTabProp?: "sales" | "items" }) {
  const { format: formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedWidget, setSelectedWidget] = useState<string>("grossSales");

  // Use the activeTabProp from the route to set the initial active tab
  const [activeTab, setActiveTab] = useState<"sales" | "items">(activeTabProp);
  const [chartType, setChartType] = useState<"line" | "pie" | "bar">("bar");
  const [timeGrouping, setTimeGrouping] = useState<"days" | "weeks">("days");
  const [currentItemPage, setCurrentItemPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    setLocation(`/reports/${activeTab}`);

    // Update document title based on active tab
    document.title = activeTab === "sales"
      ? "Sales Summary | POS System"
      : "Sales by Item | POS System";
  }, [activeTab, setLocation]);

  // Fetch stores
  const {
    data: stores,
    isLoading: isLoadingStores
  } = useQuery<StoreSettings[]>({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Fetch employees (users)
  const {
    data: employees,
    isLoading: isLoadingEmployees
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    }
  });

  // Calculate date range
  const { startDate, endDate } = dateRange === "custom"
    ? { startDate: customDateRange.from, endDate: customDateRange.to }
    : getDateRange(dateRange);

  // Format dates for API
  const formattedStartDate = format(startDate, "yyyy-MM-dd");
  const formattedEndDate = format(endDate, "yyyy-MM-dd");

  // Fetch sales report
  const {
    data: salesReport,
    isLoading: isLoadingSales,
    isError: isSalesError
  } = useQuery({
    queryKey: [`/api/reports/sales?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/sales?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`
      );
      return response.json();
    },
    enabled: activeTab === "sales"
  });

  // Fetch item sales report
  const {
    data: itemsReport,
    isLoading: isLoadingItems,
    isError: isItemsError
  } = useQuery({
    queryKey: [`/api/reports/items?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/items?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`
      );
      return response.json();
    },
    enabled: activeTab === "items"
  });

  const widgets = [
    { id: 'grossSales', title: 'Gross Sales', value: salesReport?.grossSales || 0, color: '#2563eb' },
    { id: 'refunds', title: 'Refunds', value: salesReport?.refunds || 0, color: '#dc2626' },
    { id: 'discounts', title: 'Discounts', value: salesReport?.discounts || 0, color: '#eab308' },
    { id: 'netSales', title: 'Net Sales', value: salesReport?.netSales || 0, color: '#16a34a' },
    { id: 'grossProfit', title: 'Gross Profit', value: salesReport?.grossProfit || 0, color: '#9333ea' }
  ];

  // Format numbers for tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex space-x-4">
          <button
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === "sales"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("sales")}
          >
            Sales Summary
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === "items"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("items")}
          >
            Sales by Item
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">{activeTab === "sales" ? "Sales Summary" : "Sales by Item"}</h1>

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

          {activeTab === "items" && (
            <div>
              <Label htmlFor="chartType">Chart Type</Label>
              <Select value={chartType} onValueChange={(value) => setChartType(value as "bar" | "line" | "pie")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === "items" && (
            <div>
              <Label htmlFor="timeGrouping">Time Grouping</Label>
              <Select value={timeGrouping} onValueChange={(value) => setTimeGrouping(value as "days" | "weeks")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Widgets Grid */}
      {activeTab === "sales" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {widgets.map((widget) => (
            <Card
              key={widget.id}
              className={`cursor-pointer transition-all ${
                selectedWidget === widget.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedWidget(widget.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {widget.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold`} style={{ color: widget.color }}>
                  {formatCurrency(widget.value)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Graph Section for Sales */}
      {activeTab === "sales" && selectedWidget && (
        <Card>
          <CardHeader>
            <CardTitle>{widgets.find(w => w.id === selectedWidget)?.title} Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]"> {/* Increased height for better visibility */}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesReport?.trends?.[selectedWidget] || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
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
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={widgets.find(w => w.id === selectedWidget)?.title}
                    stroke={widgets.find(w => w.id === selectedWidget)?.color}
                    strokeWidth={2}
                    dot={{ fill: widgets.find(w => w.id === selectedWidget)?.color }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graph Section for Items Sales with inline top 5 */}
      {activeTab === "items" && isLoadingItems && (
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

      {activeTab === "items" && !isLoadingItems && isItemsError && (
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

      {activeTab === "items" && !isLoadingItems && !isItemsError && (!itemsReport?.timeSeriesData || itemsReport.timeSeriesData.length === 0) && (
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

      {activeTab === "items" && !isLoadingItems && !isItemsError && itemsReport?.timeSeriesData && (
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

      {/* Sales Table */}
      {activeTab === "sales" && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Gross Sales</TableHead>
                  <TableHead>Refunds</TableHead>
                  <TableHead>Discounts</TableHead>
                  <TableHead>Net Sales</TableHead>
                  <TableHead>Taxes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSales ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(6).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isSalesError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-red-500">
                      Failed to load sales data
                    </TableCell>
                  </TableRow>
                ) : salesReport?.dailySales?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No sales data available for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  salesReport?.dailySales?.map((day: any) => (
                    <TableRow key={day.date}>
                      <TableCell>{format(new Date(day.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{formatCurrency(Number(day.grossSales))}</TableCell>
                      <TableCell>{formatCurrency(Number(day.refunds))}</TableCell>
                      <TableCell>{formatCurrency(Number(day.discounts))}</TableCell>
                      <TableCell>{formatCurrency(Number(day.netSales))}</TableCell>
                      <TableCell>{formatCurrency(Number(day.taxes))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Item Sales Table */}
      {activeTab === "items" && (
        <Card>
          <CardHeader>
            <CardTitle>Sales by Item</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Items Sold</TableHead>
                  <TableHead>Net Sales</TableHead>
                  <TableHead>Taxes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingItems ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(5).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isItemsError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-red-500">
                      Failed to load item sales data
                    </TableCell>
                  </TableRow>
                ) : !itemsReport?.items || itemsReport.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
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
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.categoryName || "Uncategorized"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.netSales)}</TableCell>
                        <TableCell>{formatCurrency(item.taxes)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>

            {/* Pagination for item sales table */}
            {!isLoadingItems && !isItemsError && itemsReport?.items && itemsReport.items.length > 0 && (
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
      )}
    </div>
  );
}

export function ReportsIndexPage() {
  const [location, setLocation] = useLocation();

  // Set document title
  document.title = "Reports | POS System";

  // If someone navigates directly to /reports, redirect them to sales summary by default
  useEffect(() => {
    if (location === "/reports") {
      setLocation("/reports/sales");
    }
  }, [location, setLocation]);

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/reports/sales")}>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
            <CardDescription>View overall sales performance and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-6xl text-primary/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/reports/items")}>
          <CardHeader>
            <CardTitle>Sales by Item</CardTitle>
            <CardDescription>Analyze performance of individual products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-6xl text-primary/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/reports/shifts")}>
          <CardHeader>
            <CardTitle>Shifts Report</CardTitle>
            <CardDescription>View shift details including cash differences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-6xl text-primary/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
