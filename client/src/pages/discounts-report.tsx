import { useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrency } from "@/hooks/use-currency";
import { Download } from "lucide-react";

// Types for discounts report
interface DiscountData {
  discountId: number;
  discountName: string;
  discountsApplied: number;
  amountDiscounted: number;
}

interface DiscountsReportData {
  startDate: string;
  endDate: string;
  discounts: DiscountData[];
  totalDiscountsApplied: number;
  totalAmountDiscounted: number;
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

export default function DiscountsReportPage() {
  const { format: formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  // Update document title
  document.title = "Discounts Report | POS System";

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

  // Fetch discounts report
  const {
    data: discountsReport,
    isLoading: isLoadingDiscounts,
    isError: isDiscountsError
  } = useQuery<DiscountsReportData>({
    queryKey: [`/api/reports/discounts?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/discounts?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`
      );
      return response.json();
    }
  });

  // Handle export to CSV
  const exportToCSV = () => {
    if (!discountsReport) return;

    // Create CSV content
    const headers = ["Discount Name", "Discounts Applied", "Amount Discounted"];
    const rows = discountsReport.discounts.map(discount => [
      discount.discountName,
      discount.discountsApplied.toString(),
      discount.amountDiscounted.toString()
    ]);

    // Add totals row
    rows.push([
      "TOTAL",
      discountsReport.totalDiscountsApplied.toString(),
      discountsReport.totalAmountDiscounted.toString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\\n");

    // Create download link
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `discounts_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Filters Section */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Discounts Report</h1>

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

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Discounts</CardTitle>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoadingDiscounts || !discountsReport?.discounts?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Discount Name</TableHead>
                <TableHead>Discounts Applied</TableHead>
                <TableHead>Amount Discounted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingDiscounts ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(3).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isDiscountsError ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-red-500">
                    Failed to load discounts data
                  </TableCell>
                </TableRow>
              ) : !discountsReport?.discounts || discountsReport.discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No discounts data available for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {discountsReport.discounts.map((discount) => (
                    <TableRow key={discount.discountId}>
                      <TableCell className="font-medium">{discount.discountName}</TableCell>
                      <TableCell>{discount.discountsApplied}</TableCell>
                      <TableCell>{formatCurrency(discount.amountDiscounted)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell className="font-bold">{discountsReport.totalDiscountsApplied}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(discountsReport.totalAmountDiscounted)}</TableCell>
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
