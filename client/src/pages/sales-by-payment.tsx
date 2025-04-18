import { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import { useLocation } from "wouter";

// Types for payment type report
interface PaymentTypeData {
  paymentTypeId: number;
  paymentTypeName: string;
  transactionCount: number;
  paymentAmount: number;
  refundTransactionCount: number;
  refundAmount: number;
  netAmount: number;
}

interface PaymentReportData {
  startDate: string;
  endDate: string;
  paymentTypes: PaymentTypeData[];
  totalPaymentAmount: number;
  totalRefundAmount: number;
  totalNetAmount: number;
}

const dateRanges = [
  { value: "all", label: "All Time" },
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

export default function SalesByPaymentPage() {
  const { format: formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Update document title
    document.title = "Sales by Payment Type | POS System";
  }, []);

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

  // Fetch employees
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

  // Fetch payment type report
  const {
    data: paymentReport,
    isLoading: isLoadingReport,
    isError: isReportError
  } = useQuery<PaymentReportData>({
    queryKey: [`/api/reports/payment-types?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/payment-types?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`
      );
      return response.json();
    }
  });

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      <h1 className="text-2xl font-bold">Sales by Payment Type</h1>

      {/* Filters Section */}
      <div className="flex flex-col space-y-4">
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

      {/* Payment Type Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Type Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Type</TableHead>
                <TableHead>Payment Transactions</TableHead>
                <TableHead>Payment Amount</TableHead>
                <TableHead>Refund Transactions</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Net Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingReport ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isReportError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-red-500">
                    Failed to load payment type data
                  </TableCell>
                </TableRow>
              ) : !paymentReport?.paymentTypes || paymentReport.paymentTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No payment type data available for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paymentReport.paymentTypes.map((paymentType) => (
                    <TableRow key={paymentType.paymentTypeId || paymentType.paymentTypeName}>
                      <TableCell className="font-medium">{paymentType.paymentTypeName}</TableCell>
                      <TableCell>{paymentType.transactionCount}</TableCell>
                      <TableCell>{formatCurrency(paymentType.paymentAmount)}</TableCell>
                      <TableCell>{paymentType.refundTransactionCount}</TableCell>
                      <TableCell>{formatCurrency(paymentType.refundAmount)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(paymentType.netAmount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell>{paymentReport.paymentTypes.reduce((sum, pt) => sum + pt.transactionCount, 0)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(paymentReport.totalPaymentAmount)}</TableCell>
                    <TableCell>{paymentReport.paymentTypes.reduce((sum, pt) => sum + pt.refundTransactionCount, 0)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(paymentReport.totalRefundAmount)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(paymentReport.totalNetAmount)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
