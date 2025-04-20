import React from "react";
import { useQuery } from "react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import apiRequest from "../../utils/apiRequest";
import { getDateRange } from "../../utils/dateUtils";

interface PaymentTypesReportResponse {
  // Define the structure of the response
}

const PaymentTypesReport: React.FC = () => {
  const [dateRange, setDateRange] = React.useState<string>("last7days");
  const [customDateRange, setCustomDateRange] = React.useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);

  // Calculate date range
  const { startDate, endDate } = dateRange === "custom"
    ? { startDate: customDateRange.from, endDate: customDateRange.to }
    : getDateRange(dateRange);

  // Format dates for API
  const formattedStartDate = format(startDate, "yyyy-MM-dd");
  const formattedEndDate = format(endDate, "yyyy-MM-dd");

  // Fetch payment types report
  const {
    data: paymentTypesReport,
    isLoading: isLoadingReport
  } = useQuery<PaymentTypesReportResponse>({
    queryKey: [`/api/reports/payment-types?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/reports/payment-types?startDate=${formattedStartDate}&endDate=${formattedEndDate}&store=${selectedStore}`
      );
      return response.json();
    },
    enabled: !!selectedStore
  });

  return (
    <div>
      <h1>Payment Types Report</h1>
      {/* Add UI components for selecting date range and store */}
      {isLoadingReport ? (
        <p>Loading...</p>
      ) : (
        <pre>{JSON.stringify(paymentTypesReport, null, 2)}</pre>
      )}
    </div>
  );
};

export default PaymentTypesReport;