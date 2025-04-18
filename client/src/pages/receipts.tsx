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
import { Input } from "@/components/ui/input";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Types for receipts report
interface ReceiptData {
  id: number;
  receiptNo: string;
  date: string;
  storeId: number;
  storeName: string;
  employeeId: number;
  employeeName: string;
  customerId: number | null;
  customerName: string;
  type: "Sale" | "Refund";
  total: number;
}

interface ReceiptsReportData {
  startDate: string;
  endDate: string;
  widgets: {
    allReceipts: number;
    sales: number;
    refunds: number;
  };
  receipts: ReceiptData[];
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

export default function ReceiptsPage() {
  const { format: formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Update document title
  document.title = "Receipts Report | POS System";

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

  // Fetch receipts report
  const {
    data: receiptsReport,
    isLoading: isLoadingReceipts,
    isError: isReceiptsError
  } = useQuery<ReceiptsReportData>({
    queryKey: [`/api/reports/receipts?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}&search=${encodeURIComponent(searchTerm)}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/receipts?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}&search=${encodeURIComponent(searchTerm)}`
      );
      return response.json();
    }
  });

  // Filter receipts by search term
  const filteredReceipts = receiptsReport?.receipts || [];

  // Handle export to CSV
  const exportToCSV = () => {
    if (!receiptsReport) return;

    // Create CSV content
    const headers = ["Receipt No", "Date", "Store", "Employee", "Customer", "Type", "Total"];
    const rows = receiptsReport.receipts.map(receipt => [
      receipt.receiptNo,
      receipt.date,
      receipt.storeName,
      receipt.employeeName,
      receipt.customerName,
      receipt.type,
      receipt.total.toString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\\n");

    // Create download link
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `receipts_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const widgets = [
    { id: 'allReceipts', title: 'All Receipts', value: receiptsReport?.widgets.allReceipts || 0, color: '#2563eb' },
    { id: 'sales', title: 'Sales', value: receiptsReport?.widgets.sales || 0, color: '#16a34a' },
    { id: 'refunds', title: 'Refunds', value: receiptsReport?.widgets.refunds || 0, color: '#dc2626' }
  ];

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Filters Section */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Receipts Report</h1>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {widgets.map((widget) => (
          <Card key={widget.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {widget.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold`} style={{ color: widget.color }}>
                {widget.id === 'allReceipts' || widget.id === 'sales' || widget.id === 'refunds'
                  ? (isLoadingReceipts
                      ? <Skeleton className="h-8 w-24" />
                      : widget.value)
                  : (isLoadingReceipts
                      ? <Skeleton className="h-8 w-24" />
                      : formatCurrency(widget.value))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Receipts</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search receipt or customer..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoadingReceipts || !receiptsReport?.receipts?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingReceipts ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isReceiptsError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-red-500">
                    Failed to load receipts data
                  </TableCell>
                </TableRow>
              ) : filteredReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No receipts found for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNo}</TableCell>
                    <TableCell>{format(new Date(receipt.date), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell>{receipt.storeName}</TableCell>
                    <TableCell>{receipt.employeeName}</TableCell>
                    <TableCell>{receipt.customerName}</TableCell>
                    <TableCell>
                      <Badge variant={receipt.type === 'Sale' ? "default" : "destructive"}>
                        {receipt.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(receipt.total)}</TableCell>
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
