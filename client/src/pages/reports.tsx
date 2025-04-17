import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

// Date range options
const dateRanges = [
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

// Pie chart colors
const COLORS = ['#3B82F6', '#10B981', '#6366F1', '#F59E0B', '#EF4444'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("last30days");

  // Calculate date range
  const { startDate, endDate } = getDateRange(dateRange);

  // Format dates for API
  const formattedStartDate = format(startDate, "yyyy-MM-dd");
  const formattedEndDate = format(endDate, "yyyy-MM-dd");

  // Fetch sales report
  const {
    data: salesReport,
    isLoading,
    isError
  } = useQuery({
    queryKey: [`/api/reports/sales?startDate=${formattedStartDate}&endDate=${formattedEndDate}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/sales?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      return response.json();
    }
  });

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Sales Reports</h1>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Label htmlFor="dateRange" className="hidden sm:inline">Date Range:</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : isError ? (
              <p className="text-red-500">Error</p>
            ) : (
              <div className="text-2xl font-bold">${Number(salesReport?.totalSales).toFixed(2) || "0.00"}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : isError ? (
              <p className="text-red-500">Error</p>
            ) : (
              <div className="text-2xl font-bold">{salesReport?.orderCount || "0"}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : isError ? (
              <p className="text-red-500">Error</p>
            ) : (
              <div className="text-2xl font-bold">
                ${salesReport?.orderCount ? (Number(salesReport.totalSales) / salesReport.orderCount).toFixed(2) : "0.00"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Period</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : isError ? (
              <p className="text-red-500">Error</p>
            ) : (
              <div className="text-md font-bold">
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-4">
                <p className="text-red-500">Failed to load product data. Please try again.</p>
              </div>
            ) : !salesReport?.topProducts?.length ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No product data available for the selected period.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {salesReport.topProducts.map((product: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <span className="text-gray-500">${Number(product.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Product</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="w-full h-64 flex items-center justify-center">
                <Skeleton className="w-64 h-64 rounded-full" />
              </div>
            ) : isError ? (
              <div className="text-center py-4">
                <p className="text-red-500">Failed to load product data. Please try again.</p>
              </div>
            ) : !salesReport?.topProducts?.length ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No product data available for the selected period.</p>
              </div>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesReport.topProducts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {salesReport.topProducts.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Sales']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
