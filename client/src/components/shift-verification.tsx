import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shift, User } from "@shared/schema";
import { AlertCircle, CircleDollarSign } from "lucide-react";

export default function ShiftVerification() {
  const [, navigate] = useLocation();

  // Get current user
  const { data: currentUser, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/auth/current"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/current");
      return response.json();
    }
  });

  // Get active shift for current user
  const { data: activeShifts, isLoading: isLoadingShift } = useQuery<Shift[]>({
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

  // Current active shift
  const activeShift = activeShifts && activeShifts.length > 0 ? activeShifts[0] : null;

  // Determine if user needs shift verification (only cashiers need to verify shifts)
  const needsShiftVerification = currentUser?.role === 'cashier';

  // Automatically redirect to shift management if cashier with no shift
  useEffect(() => {
    if (!isLoadingUser && !isLoadingShift && needsShiftVerification && !activeShift) {
      // Auto-redirect after a short delay
      const timer = setTimeout(() => {
        navigate("/shift-management");
      }, 300); // 3 second delay before auto-redirect

      return () => clearTimeout(timer);
    }
  }, [currentUser, activeShift, isLoadingUser, isLoadingShift, navigate, needsShiftVerification]);

  const handleStartShift = () => {
    navigate("/shift-management");
  };

  if (isLoadingUser || isLoadingShift) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only require shift verification for cashiers
  if (needsShiftVerification && !activeShift) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Shift Required
            </CardTitle>
            <CardDescription>
              You need to start a shift before you can use the POS system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              As a cashier, you are required to start a shift before you can process transactions.
              You will be redirected to the shift management page in a few seconds.
            </p>
            <p className="mb-6">
              Starting a shift allows you to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-6">
              <li>Process sales transactions</li>
              <li>Track cash management</li>
              <li>Record your opening cash amount</li>
              <li>Perform end-of-day closing procedures</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStartShift} className="w-full">
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Start a Shift
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}
