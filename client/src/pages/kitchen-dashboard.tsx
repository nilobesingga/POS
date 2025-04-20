import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Check, PlayCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { format, formatDistance } from "date-fns";
import { KitchenOrder, KitchenOrderItem } from "@shared/schema";

// Define the extended types for our kitchen order data
interface KitchenOrderWithDetails extends KitchenOrder {
  order: {
    id: number;
    orderNumber: string;
    storeId: number;
    createdAt: string;
  };
  items: KitchenItemWithDetails[];
}

interface KitchenItemWithDetails extends KitchenOrderItem {
  orderItem: {
    quantity: number;
  };
  product: {
    name: string;
    description?: string;
  };
}

export default function KitchenDashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  // Update document title
  useEffect(() => {
    document.title = "Kitchen Dashboard | POS System";
  }, []);

  // Fetch stores
  const {
    data: stores,
    isLoading: isLoadingStores
  } = useQuery({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Fetch kitchen orders
  const {
    data: kitchenOrders,
    isLoading: isLoadingOrders,
    isError,
    refetch: refetchOrders
  } = useQuery<KitchenOrderWithDetails[]>({
    queryKey: ["/api/kitchen/orders", activeTab, selectedStoreId],
    queryFn: async () => {
      let url = `/api/kitchen/orders?status=${activeTab}`;
      if (selectedStoreId !== "all") {
        url += `&storeId=${selectedStoreId}`;
      }
      const response = await apiRequest("GET", url);
      return response.json();
    },
    refetchInterval: activeTab === "pending" || activeTab === "in-progress" ? 5000 : false // Auto-refresh active orders every 5 seconds
  });

  // Update kitchen order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/kitchen/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      toast({
        title: "Status Updated",
        description: "Kitchen order status has been updated"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  });

  // Update kitchen order item status
  const updateOrderItemStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/kitchen/orders/items/${itemId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      toast({
        title: "Status Updated",
        description: "Item status has been updated"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive"
      });
    }
  });

  // Helper function to get badge color based on status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "in-progress":
        return "bg-blue-500 hover:bg-blue-600";
      case "completed":
        return "bg-green-500 hover:bg-green-600";
      case "cancelled":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  // Format time since order was created
  const formatTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistance(date, new Date(), { addSuffix: true });
  };

  // Helper to handle start cooking action
  const handleStartCooking = (orderItem: KitchenItemWithDetails) => {
    updateOrderItemStatus.mutate({ itemId: orderItem.id, status: "in-progress" });
  };

  // Helper to handle complete item action
  const handleCompleteItem = (orderItem: KitchenItemWithDetails) => {
    updateOrderItemStatus.mutate({ itemId: orderItem.id, status: "completed" });
  };

  // Helper to handle cancel item action
  const handleCancelItem = (orderItem: KitchenItemWithDetails) => {
    updateOrderItemStatus.mutate({ itemId: orderItem.id, status: "cancelled" });
  };

  // Helper to handle order status change
  const handleOrderStatusChange = (order: KitchenOrderWithDetails, status: string) => {
    updateOrderStatus.mutate({ orderId: order.id, status });
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="flex justify-between items-center mb-6 text-2xl font-bold">Kitchen Dashboard</h1>

      {/* Store selection */}
      <div className="flex items-center mb-6 gap-4">
        <div className="w-64">
          <Select
            value={selectedStoreId}
            onValueChange={(value) => setSelectedStoreId(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {!isLoadingStores && stores?.map((store: any) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name} {store.branch ? `(${store.branch})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => refetchOrders()}>
          Refresh
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs
        defaultValue="pending"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        {/* Orders for each status */}
        {["pending", "in-progress", "completed", "cancelled"].map((status) => (
          <TabsContent key={status} value={status} className="mt-4">
            {isLoadingOrders ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="shadow-md">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-40 mb-2" />
                      <Skeleton className="h-4 w-28" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="mr-2" />
                    <p>Failed to load kitchen orders. Please try again.</p>
                  </div>
                </CardContent>
              </Card>
            ) : kitchenOrders?.length === 0 ? (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">No {status} orders found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kitchenOrders?.map((order) => (
                  <Card key={order.id} className="shadow-md overflow-hidden">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">Order #{order.order.orderNumber}</CardTitle>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatTimeSince(order.createdAt)}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeClass(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y">
                        {order.items.map((item) => (
                          <li key={item.id} className="py-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">
                                  {item.orderItem.quantity}x {item.product.name}
                                </span>
                                {item.product.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {item.product.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center">
                                {status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="ml-2"
                                    onClick={() => handleStartCooking(item)}
                                  >
                                    <PlayCircle className="w-4 h-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                                {status === "in-progress" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="ml-2"
                                    onClick={() => handleCompleteItem(item)}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                {(status === "pending" || status === "in-progress") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="ml-2 text-red-500 hover:text-red-600"
                                    onClick={() => handleCancelItem(item)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                {item.startedAt && (
                                  <div className="ml-2 flex items-center text-sm text-gray-500">
                                    <Timer className="w-4 h-4 mr-1" />
                                    {formatDistance(
                                      new Date(item.startedAt),
                                      item.completedAt ? new Date(item.completedAt) : new Date(),
                                      { includeSeconds: true }
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {order.notes && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                          <p className="text-sm font-semibold">Notes:</p>
                          <p className="text-sm">{order.notes}</p>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end">
                        {status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleOrderStatusChange(order, "in-progress")}
                          >
                            Start All
                          </Button>
                        )}
                        {status === "in-progress" && (
                          <Button
                            size="sm"
                            onClick={() => handleOrderStatusChange(order, "completed")}
                          >
                            Complete Order
                          </Button>
                        )}
                        {(status === "pending" || status === "in-progress") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2 text-red-500 hover:text-red-600"
                            onClick={() => handleOrderStatusChange(order, "cancelled")}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
