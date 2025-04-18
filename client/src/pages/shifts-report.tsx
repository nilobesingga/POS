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
import { StoreSettings, User, Shift } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrency } from "@/hooks/use-currency";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Types for shift report data
interface ShiftReportData {
  startDate: string;
  endDate: string;
  shifts: {
    id: number;
    storeId: number;
    storeName: string;
    userId: number;
    userName: string;
    openingTime: string;
    closingTime: string | null;
    expectedCashAmount: number;
    actualCashAmount: number | null;
    difference: number | null;
    isActive: boolean;
    notes: string | null;
  }[];
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

export default function ShiftsReportPage() {
  const { format: formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  // Update document title
  document.title = "Shifts Report | POS System";

  // Fetch stores
  const { data: stores, isLoading: isLoadingStores } = useQuery<StoreSettings[]>({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Fetch employees (users)
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<User[]>({
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

  // Fetch shifts report
  const {
    data: shiftsReport,
    isLoading: isLoadingShifts,
    isError: isShiftsError
  } = useQuery<ShiftReportData>({
    queryKey: [`/api/shifts/reports?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/shifts/reports?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`
      );
      return response.json();
    }
  });

  // Handle export to CSV
  const exportToCSV = () => {
    if (!shiftsReport) return;

    // Create CSV content
    const columns = [
      "POS",
      "Employee",
      "Opening Time",
      "Closing Time",
      "Expected Cash",
      "Actual Cash",
      "Difference",
      "Status",
      "Notes"
    ];

    const data = shiftsReport.shifts.map(shift => [
      shift.storeName,
      shift.userName,
      format(new Date(shift.openingTime), "yyyy-MM-dd HH:mm:ss"),
      shift.closingTime ? format(new Date(shift.closingTime), "yyyy-MM-dd HH:mm:ss") : "-",
      shift.expectedCashAmount.toString(),
      shift.actualCashAmount !== null ? shift.actualCashAmount.toString() : "-",
      shift.difference !== null ? shift.difference.toString() : "-",
      shift.isActive ? "Active" : "Closed",
      shift.notes || ""
    ]);

    const csvContent = [
      columns.join(","),
      ...data.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\\n");

    // Create download link
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shifts_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Filters Section */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Shifts Report</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Export Button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Shifts</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={isLoadingShifts || !shiftsReport?.shifts?.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Shifts Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>POS</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Opening Time</TableHead>
                <TableHead>Closing Time</TableHead>
                <TableHead>Expected Cash</TableHead>
                <TableHead>Actual Cash</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingShifts ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isShiftsError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-red-500">
                    Failed to load shifts data
                  </TableCell>
                </TableRow>
              ) : !shiftsReport?.shifts || shiftsReport.shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No shifts found for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                shiftsReport.shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.storeName}</TableCell>
                    <TableCell>{shift.userName}</TableCell>
                    <TableCell>{format(new Date(shift.openingTime), "MMM dd, yyyy h:mm a")}</TableCell>
                    <TableCell>
                      {shift.closingTime
                        ? format(new Date(shift.closingTime), "MMM dd, yyyy h:mm a")
                        : "—"
                      }
                    </TableCell>
                    <TableCell>{formatCurrency(shift.expectedCashAmount)}</TableCell>
                    <TableCell>
                      {shift.actualCashAmount !== null
                        ? formatCurrency(shift.actualCashAmount)
                        : "—"
                      }
                    </TableCell>
                    <TableCell>
                      {shift.difference !== null ? (
                        <span className={shift.difference < 0 ? "text-red-500" : "text-green-500"}>
                          {formatCurrency(shift.difference)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={shift.isActive ? "default" : "secondary"}>
                        {shift.isActive ? "Active" : "Closed"}
                      </Badge>
                    </TableCell>
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
