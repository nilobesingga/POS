import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Shift, User } from "@shared/schema";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleDollarSign, Clock, AlertCircle, ChevronDown } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

// Format time elapsed since shift start
const formatTimeElapsed = (startTime: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export default function ShiftStatus() {
  const [, navigate] = useLocation();
  const { format: formatCurrency } = useCurrency();

  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/current"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/current");
      return response.json();
    }
  });

  // Get active shift for current user
  const { data: activeShifts, isLoading } = useQuery<Shift[]>({
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

  // Navigate to shift management
  const handleManageShift = () => {
    navigate("/shift-management");
  };

  if (isLoading) {
    return (
      <div className="flex items-center">
        <Badge variant="outline" className="animate-pulse">
          Loading...
        </Badge>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex gap-1 items-center">
          <AlertCircle className="h-3 w-3" />
          <span>No Active Shift</span>
        </Badge>
        <Button size="sm" variant="outline" onClick={handleManageShift}>
          Start Shift
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Badge variant="default" className="mr-1">Active Shift</Badge>
          <span className="hidden md:inline-block">
            {formatTimeElapsed(new Date(activeShift.openingTime))}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Shift Details</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center justify-between cursor-default">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <span>Started</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(activeShift.openingTime), "h:mm a")}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center justify-between cursor-default">
            <div className="flex items-center">
              <CircleDollarSign className="mr-2 h-4 w-4" />
              <span>Opening Cash</span>
            </div>
            <span className="text-xs">
              {formatCurrency(Number(activeShift.expectedCashAmount))}
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManageShift} className="text-center justify-center font-medium">
          Manage Shift
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
