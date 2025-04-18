import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrency } from "@/hooks/use-currency";

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

export default function SalesSummaryPage() {
  const { format: formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedWidget, setSelectedWidget] = useState<string>("grossSales");

  // Set document title
  document.title = "Sales Summary | POS System";

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
    }
  });

  // Define the type for trend items
  interface TrendItem {
    date: string;
    value: number;
  }

  // Filter data for charts based on sales report data
  const filteredData = useMemo(() => {
    return salesReport?.trends ? Object.values(salesReport.trends).flat().filter((item: unknown) => {
      const trendItem = item as TrendItem;
      // Filter by date range
      return (!startDate || new Date(trendItem.date) >= startDate) &&
        (!endDate || new Date(trendItem.date) <= endDate);
    }) : [];
  }, [salesReport, startDate, endDate]);

  // Ensure data is fetched when component mounts or when key parameters change
  useEffect(() => {
    // This will cause the useQuery hook to execute
    // We're just making sure the dependencies are properly tracked
  }, [formattedStartDate, formattedEndDate, selectedStore, selectedEmployee]);

  // Format numbers for tooltip with null safety
  const formatTooltipValue = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return formatCurrency(0);

    // Convert string to number if needed
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Handle NaN values
    if (isNaN(numValue)) return formatCurrency(0);

    return formatCurrency(numValue);
  };

  // Define widgets with null safety
  const widgets = [
    {
      id: 'grossSales',
      title: 'Gross Sales',
      value: typeof salesReport?.grossSales === 'number' && !isNaN(salesReport?.grossSales)
        ? salesReport.grossSales
        : 0,
      color: '#2563eb'
    },
    {
      id: 'refunds',
      title: 'Refunds',
      value: typeof salesReport?.refunds === 'number' && !isNaN(salesReport?.refunds)
        ? salesReport.refunds
        : 0,
      color: '#dc2626'
    },
    {
      id: 'discounts',
      title: 'Discounts',
      value: typeof salesReport?.discounts === 'number' && !isNaN(salesReport?.discounts)
        ? salesReport.discounts
        : 0,
      color: '#eab308'
    },
    {
      id: 'netSales',
      title: 'Net Sales',
      value: typeof salesReport?.netSales === 'number' && !isNaN(salesReport?.netSales)
        ? salesReport.netSales
        : 0,
      color: '#16a34a'
    },
    {
      id: 'grossProfit',
      title: 'Gross Profit',
      value: typeof salesReport?.grossProfit === 'number' && !isNaN(salesReport?.grossProfit)
        ? salesReport.grossProfit
        : 0,
      color: '#9333ea'
    }
  ];

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Sales Summary</h1>

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

      {/* Widgets Grid */}
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

      {/* Graph Section for Sales */}
      {selectedWidget && (
        <Card>
          <CardHeader>
            <CardTitle>{widgets.find(w => w.id === selectedWidget)?.title} Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
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

      {/* Sales Table */}
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
                    <TableCell>{day.date ? format(new Date(day.date), "MMM dd, yyyy") : "Unknown Date"}</TableCell>
                    <TableCell>{formatCurrency(day.grossSales !== undefined ? Number(day.grossSales) : 0)}</TableCell>
                    <TableCell>{formatCurrency(day.refunds !== undefined ? Number(day.refunds) : 0)}</TableCell>
                    <TableCell>{formatCurrency(day.discounts !== undefined ? Number(day.discounts) : 0)}</TableCell>
                    <TableCell>{formatCurrency(day.netSales !== undefined ? Number(day.netSales) : 0)}</TableCell>
                    <TableCell>{formatCurrency(day.taxes !== undefined ? Number(day.taxes) : 0)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
