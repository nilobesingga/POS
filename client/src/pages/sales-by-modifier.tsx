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
import { ChevronDown, Download, Columns } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types for modifier sales report
interface ModifierSalesData {
  modifierId: number;
  modifierName: string;
  quantitySold: number;
  grossSales: number;
  quantityRefunded: number;
  refundAmount: number;
  netSales: number;
}

interface ModifiersReportData {
  startDate: string;
  endDate: string;
  modifiers: ModifierSalesData[];
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

export default function SalesByModifierPage() {
  const { format: formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState("last30days");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [showColumns, setShowColumns] = useState<{
    quantitySold: boolean;
    grossSales: boolean;
    quantityRefunded: boolean;
    refundAmount: boolean;
    netSales: boolean;
  }>({
    quantitySold: true,
    grossSales: true,
    quantityRefunded: true,
    refundAmount: true,
    netSales: true,
  });

  // Update document title
  document.title = "Sales by Modifier | POS System";

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

  // Fetch modifiers sales report
  const {
    data: modifiersReport,
    isLoading: isLoadingModifiers,
    isError: isModifiersError
  } = useQuery<ModifiersReportData>({
    queryKey: [`/api/reports/modifiers?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/modifiers?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}&employee=${selectedEmployee}`
      );
      return response.json();
    }
  });

  // Handle export to CSV
  const exportToCSV = () => {
    if (!modifiersReport) return;

    // Create CSV content
    const columns: string[] = ["Modifier"];
    const data: string[][] = modifiersReport.modifiers.map(mod => [mod.modifierName]);
    let idx = 1;

    if (showColumns.quantitySold) {
      columns.push("Quantity Sold");
      modifiersReport.modifiers.forEach((mod, i) => {
        data[i][idx] = mod.quantitySold.toString();
      });
      idx++;
    }

    if (showColumns.grossSales) {
      columns.push("Gross Sales");
      modifiersReport.modifiers.forEach((mod, i) => {
        data[i][idx] = mod.grossSales.toString();
      });
      idx++;
    }

    if (showColumns.quantityRefunded) {
      columns.push("Quantity Refunded");
      modifiersReport.modifiers.forEach((mod, i) => {
        data[i][idx] = mod.quantityRefunded.toString();
      });
      idx++;
    }

    if (showColumns.refundAmount) {
      columns.push("Refund Amount");
      modifiersReport.modifiers.forEach((mod, i) => {
        data[i][idx] = mod.refundAmount.toString();
      });
      idx++;
    }

    if (showColumns.netSales) {
      columns.push("Net Sales");
      modifiersReport.modifiers.forEach((mod, i) => {
        data[i][idx] = mod.netSales.toString();
      });
    }

    const csvContent = [
      columns.join(","),
      ...data.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\\n");

    // Create download link
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_by_modifier_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      {/* Filters Section */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Sales by Modifier</h1>

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

      {/* Column Toggle and Export */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Modifiers Sales</CardTitle>
            <div className="flex items-center gap-2">
              {/* Column toggle dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <div className="flex items-center space-x-2 px-2 py-1.5 w-full">
                      <Checkbox
                        id="col-quantity-sold"
                        checked={showColumns.quantitySold}
                        onCheckedChange={(checked) =>
                          setShowColumns(prev => ({ ...prev, quantitySold: !!checked }))
                        }
                      />
                      <Label htmlFor="col-quantity-sold" className="flex-grow cursor-pointer">
                        Quantity Sold
                      </Label>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <div className="flex items-center space-x-2 px-2 py-1.5 w-full">
                      <Checkbox
                        id="col-gross-sales"
                        checked={showColumns.grossSales}
                        onCheckedChange={(checked) =>
                          setShowColumns(prev => ({ ...prev, grossSales: !!checked }))
                        }
                      />
                      <Label htmlFor="col-gross-sales" className="flex-grow cursor-pointer">
                        Gross Sales
                      </Label>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <div className="flex items-center space-x-2 px-2 py-1.5 w-full">
                      <Checkbox
                        id="col-quantity-refunded"
                        checked={showColumns.quantityRefunded}
                        onCheckedChange={(checked) =>
                          setShowColumns(prev => ({ ...prev, quantityRefunded: !!checked }))
                        }
                      />
                      <Label htmlFor="col-quantity-refunded" className="flex-grow cursor-pointer">
                        Quantity Refunded
                      </Label>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <div className="flex items-center space-x-2 px-2 py-1.5 w-full">
                      <Checkbox
                        id="col-refund-amount"
                        checked={showColumns.refundAmount}
                        onCheckedChange={(checked) =>
                          setShowColumns(prev => ({ ...prev, refundAmount: !!checked }))
                        }
                      />
                      <Label htmlFor="col-refund-amount" className="flex-grow cursor-pointer">
                        Refund Amount
                      </Label>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                    <div className="flex items-center space-x-2 px-2 py-1.5 w-full">
                      <Checkbox
                        id="col-net-sales"
                        checked={showColumns.netSales}
                        onCheckedChange={(checked) =>
                          setShowColumns(prev => ({ ...prev, netSales: !!checked }))
                        }
                      />
                      <Label htmlFor="col-net-sales" className="flex-grow cursor-pointer">
                        Net Sales
                      </Label>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export button */}
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoadingModifiers || !modifiersReport?.modifiers?.length}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Modifiers Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modifier</TableHead>
                {showColumns.quantitySold && <TableHead>Quantity Sold</TableHead>}
                {showColumns.grossSales && <TableHead>Gross Sales</TableHead>}
                {showColumns.quantityRefunded && <TableHead>Quantity Refunded</TableHead>}
                {showColumns.refundAmount && <TableHead>Refund Amount</TableHead>}
                {showColumns.netSales && <TableHead>Net Sales</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingModifiers ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(Object.values(showColumns).filter(Boolean).length + 1).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isModifiersError ? (
                <TableRow>
                  <TableCell colSpan={Object.values(showColumns).filter(Boolean).length + 1} className="text-center py-4 text-red-500">
                    Failed to load modifier sales data
                  </TableCell>
                </TableRow>
              ) : !modifiersReport?.modifiers || modifiersReport.modifiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Object.values(showColumns).filter(Boolean).length + 1} className="text-center py-4">
                    No modifier sales data available for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                modifiersReport.modifiers.map((modifier) => (
                  <TableRow key={modifier.modifierId}>
                    <TableCell className="font-medium">{modifier.modifierName}</TableCell>
                    {showColumns.quantitySold && <TableCell>{modifier.quantitySold}</TableCell>}
                    {showColumns.grossSales && <TableCell>{formatCurrency(modifier.grossSales)}</TableCell>}
                    {showColumns.quantityRefunded && <TableCell>{modifier.quantityRefunded}</TableCell>}
                    {showColumns.refundAmount && <TableCell>{formatCurrency(modifier.refundAmount)}</TableCell>}
                    {showColumns.netSales && <TableCell>{formatCurrency(modifier.netSales)}</TableCell>}
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
