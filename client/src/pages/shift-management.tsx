import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shift, User, StoreSettings } from "@shared/schema";
import { format } from "date-fns";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

// Timespan formatter
const formatTimespan = (start: Date, end: Date | null) => {
  if (!end) return "In progress";

  const diffMs = end.getTime() - start.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffHrs}h ${diffMins}m`;
};

export default function ShiftManagementPage() {
  const { toast } = useToast();
  const { format: formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [cashAmount, setCashAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState<boolean>(false);

  // Update document title
  document.title = "Shift Management | POS System";

  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/current"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/current");
      return response.json();
    }
  });

  // Fetch store settings
  const { data: stores } = useQuery<StoreSettings[]>({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Get user's active shift
  const { data: activeShifts, isLoading, refetch: refetchShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", { isActive: true, userId: currentUser?.id }],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await apiRequest(
        "GET",
        `/api/shifts?isActive=true&userId=${currentUser.id}`
      );
      return response.json();
    },
    enabled: !!currentUser?.id
  });

  // Get user's recent shifts
  const { data: recentShifts, isLoading: isLoadingRecent } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", { recent: true, userId: currentUser?.id }],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      // Get recent shifts for the current user that are not active
      const response = await apiRequest(
        "GET",
        `/api/shifts?isActive=false&userId=${currentUser.id}`
      );
      return response.json();
    },
    enabled: !!currentUser?.id
  });

  // Set default store based on user's assigned store or first store
  useEffect(() => {
    if (currentUser?.storeId) {
      setSelectedStoreId(currentUser.storeId);
    } else if (stores && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [currentUser, stores]);

  // Current active shift
  const activeShift = activeShifts && activeShifts.length > 0 ? activeShifts[0] : null;

  // Store name mapping
  const getStoreName = (storeId: number) => {
    const store = stores?.find(s => s.id === storeId);
    return store ? (store.branch ? `${store.name} (${store.branch})` : store.name) : "Unknown";
  };

  // Start shift mutation
  const startShiftMutation = useMutation({
    mutationFn: async (data: { storeId: number, userId: number, expectedCashAmount: number }) => {
      const response = await apiRequest("POST", "/api/shifts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setCashAmount("");
      toast({
        title: "Shift started",
        description: "Your shift has been started successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start shift. Please try again.",
        variant: "destructive"
      });
      console.error("Failed to start shift:", error);
    }
  });

  // End shift mutation
  const endShiftMutation = useMutation({
    mutationFn: async (data: { shiftId: number, actualCashAmount: number, notes: string }) => {
      const { shiftId, ...requestBody } = data;
      const response = await apiRequest("POST", `/api/shifts/${shiftId}/end`, requestBody);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setIsCloseDialogOpen(false);
      setCashAmount("");
      setNotes("");
      toast({
        title: "Shift ended",
        description: "Your shift has been ended successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to end shift. Please try again.",
        variant: "destructive"
      });
      console.error("Failed to end shift:", error);
    }
  });

  // Function to start a new shift
  const handleStartShift = () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive"
      });
      return;
    }

    if (!selectedStoreId) {
      toast({
        title: "Error",
        description: "Please select a store for your shift",
        variant: "destructive"
      });
      return;
    }

    const cashValue = parseFloat(cashAmount);
    if (isNaN(cashValue)) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid cash amount",
        variant: "destructive"
      });
      return;
    }

    startShiftMutation.mutate({
      storeId: selectedStoreId,
      userId: currentUser.id,
      expectedCashAmount: cashValue
    });
  };

  // Function to open end shift dialog
  const handleOpenCloseDialog = () => {
    setIsCloseDialogOpen(true);
  };

  // Function to end shift
  const handleEndShift = () => {
    if (!activeShift) {
      toast({
        title: "Error",
        description: "No active shift found",
        variant: "destructive"
      });
      return;
    }

    const cashValue = parseFloat(cashAmount);
    if (isNaN(cashValue)) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid cash amount",
        variant: "destructive"
      });
      return;
    }

    endShiftMutation.mutate({
      shiftId: activeShift.id,
      actualCashAmount: cashValue,
      notes: notes
    });
  };

  // Calculate cash difference
  const calculateDifference = () => {
    if (!activeShift || !cashAmount) return null;

    const actual = parseFloat(cashAmount);
    if (isNaN(actual)) return null;

    return actual - Number(activeShift.expectedCashAmount);
  };

  const difference = calculateDifference();

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      <h1 className="text-2xl font-bold">Shift Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Shift Status */}
        <Card className="col-span-1 h-full">
          <CardHeader>
            <CardTitle>Shift Status</CardTitle>
            <CardDescription>
              {activeShift
                ? "You currently have an active shift"
                : "You don't have an active shift"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeShift ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">POS</p>
                    <p>{getStoreName(activeShift.storeId)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Started</p>
                    <p>{format(new Date(activeShift.openingTime), "MMM dd, yyyy h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p>{formatTimespan(new Date(activeShift.openingTime), new Date())}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Opening Cash</p>
                    <p>{formatCurrency(Number(activeShift.expectedCashAmount))}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <Button
                  className="w-full"
                  onClick={handleOpenCloseDialog}
                  variant="destructive"
                >
                  End Shift
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p>Start a new shift to begin taking orders.</p>

                <div className="space-y-2">
                  <Label htmlFor="storeSelect">Select Store</Label>
                  <Select
                    value={selectedStoreId?.toString() || ""}
                    onValueChange={(value) => setSelectedStoreId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores?.map((store) => (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.branch ? `${store.name} (${store.branch})` : store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashAmount">Opening Cash Amount</Label>
                  <Input
                    id="cashAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleStartShift}
                  disabled={startShiftMutation.isPending || !selectedStoreId}
                >
                  {startShiftMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Start Shift
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shift History */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Shifts</CardTitle>
            <CardDescription>Your recent shift history</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="flex justify-center items-center py-8">
                <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recentShifts && recentShifts.length > 0 ? (
              <div className="space-y-4">
                {recentShifts.map((shift) => (
                  <div key={shift.id} className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">POS</p>
                      <p>{getStoreName(shift.storeId)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Started</p>
                      <p>{format(new Date(shift.openingTime), "MMM dd, yyyy h:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ended</p>
                      <p>{format(new Date(shift.closingTime!), "MMM dd, yyyy h:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Duration</p>
                      <p>{formatTimespan(new Date(shift.openingTime), new Date(shift.closingTime!))}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No recent shifts found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Close Shift Dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Shift</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="closingCash">Closing Cash Amount</Label>
              <Input
                id="closingCash"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
              />
            </div>

            {difference !== null && (
              <div className="flex items-center gap-2">
                <p className="text-sm">
                  Difference:
                  <span className={`font-medium ${difference < 0 ? "text-destructive" : difference > 0 ? "text-green-500" : ""}`}>
                    {" "}{formatCurrency(difference)}
                  </span>
                </p>

                {difference !== 0 && (
                  <AlertCircle className={`h-4 w-4 ${difference < 0 ? "text-destructive" : "text-green-500"}`} />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about the shift..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEndShift}
              disabled={endShiftMutation.isPending || !cashAmount}
            >
              {endShiftMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              End Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
