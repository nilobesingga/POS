import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Discount, InsertDiscount } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function DiscountsPage(): JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State variables
  const [isAddDiscountDialogOpen, setIsAddDiscountDialogOpen] = useState(false);
  const [isEditDiscountDialogOpen, setIsEditDiscountDialogOpen] = useState(false);
  const [isDeleteDiscountDialogOpen, setIsDeleteDiscountDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [newDiscount, setNewDiscount] = useState<Partial<InsertDiscount>>({
    name: "",
    value: 0,
    type: "amount",
    restrictedAccess: false,
    storeId: null // This will represent "All Stores"
  });

  // Fetch discounts
  const {
    data: discounts,
    isLoading: isLoadingDiscounts,
    isError: isDiscountsError
  } = useQuery<Discount[]>({
    queryKey: ["/api/discounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/discounts");
      return response.json();
    }
  });

  interface Store {
    id: number;
    name: string;
  }

  // Fetch stores for selection
  const { data: stores } = useQuery<Store[]>({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Add discount mutation
  const addDiscountMutation = useMutation({
    mutationFn: async (discount: InsertDiscount) => {
      const response = await apiRequest("POST", "/api/discounts", discount);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      setIsAddDiscountDialogOpen(false);
      setNewDiscount({
        name: "",
        value: 0,
        type: "amount",
        restrictedAccess: false,
        storeId: null
      });
      toast({
        title: "Discount Added",
        description: "The discount has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add discount",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update discount mutation
  const updateDiscountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertDiscount }) => {
      const response = await apiRequest("PUT", `/api/discounts/${id}`, {
        ...data,
        value: Number(data.value)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      setIsEditDiscountDialogOpen(false);
      setSelectedDiscount(null);
      toast({
        title: "Discount Updated",
        description: "The discount has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update discount",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete discount mutation
  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/discounts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      setIsDeleteDiscountDialogOpen(false);
      setSelectedDiscount(null);
      toast({
        title: "Discount Deleted",
        description: "The discount has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete discount",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const handleAddDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscount.name || !newDiscount.value || !newDiscount.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    addDiscountMutation.mutate(newDiscount as InsertDiscount);
  };

  const handleEditDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscount || !selectedDiscount.name || selectedDiscount.value === undefined || !selectedDiscount.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const numValue = typeof selectedDiscount.value === 'string'
      ? parseFloat(selectedDiscount.value)
      : selectedDiscount.value;

    updateDiscountMutation.mutate({
      id: selectedDiscount.id,
      data: {
        name: selectedDiscount.name,
        value: numValue,
        type: selectedDiscount.type as "percent" | "amount",
        storeId: selectedDiscount.storeId,
        restrictedAccess: selectedDiscount.restrictedAccess
      }
    });
  };

  const handleDeleteDiscount = () => {
    if (selectedDiscount) {
      deleteDiscountMutation.mutate(selectedDiscount.id);
    }
  };

  const formatValue = (value: string | number, type: string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return type === 'percent' ? `${numValue}%` : `$${numValue.toFixed(2)}`;
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Discounts</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setNewDiscount({
                name: "Senior Citizen Discount",
                value: 20,
                type: "percent",
                restrictedAccess: false,
                storeId: null
              });
              setIsAddDiscountDialogOpen(true);
            }}
          >
            Add Senior Discount
          </Button>
          <Button onClick={() => setIsAddDiscountDialogOpen(true)}>
            Add Discount
          </Button>
        </div>
      </div>

      {/* Discounts List */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {isLoadingDiscounts ? (
          Array(3).fill(0).map((_, index) => (
            <Card key={index}>
              <CardHeader className="p-4">
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : isDiscountsError ? (
          <Card>
            <CardContent className="p-4 text-center text-red-500">
              Failed to load discounts. Please try again.
            </CardContent>
          </Card>
        ) : discounts && discounts.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              No discounts found. Start by adding a discount.
            </CardContent>
          </Card>
        ) : (
          discounts && discounts.map((discount) => (
            <Card key={discount.id} className="relative">
              <CardHeader className="p-4">
                <CardTitle className="flex justify-between items-start">
                  <span>{discount.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDiscount(discount);
                        setIsEditDiscountDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        setSelectedDiscount(discount);
                        setIsDeleteDiscountDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Value:</span>
                    <span className="font-medium">{formatValue(discount.value, discount.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type:</span>
                    <span className="capitalize">{discount.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Store:</span>
                    <span>{discount.storeId ? stores?.find(s => s.id === discount.storeId)?.name || 'Unknown' : 'All Stores'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Access:</span>
                    <span>{discount.restrictedAccess ? "Restricted" : "Public"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Discount Dialog */}
      <Dialog open={isAddDiscountDialogOpen} onOpenChange={setIsAddDiscountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Discount</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddDiscount}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Discount Name*</Label>
                <Input
                  id="name"
                  value={newDiscount.name}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Sale, Student Discount"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value*</Label>
                  <Input
                    id="value"
                    type="number"
                    step={newDiscount.type === "percent" ? "1" : "0.01"}
                    min="0"
                    max={newDiscount.type === "percent" ? "100" : undefined}
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type*</Label>
                  <Select
                    value={newDiscount.type}
                    onValueChange={(value) => setNewDiscount(prev => ({ ...prev, type: value as "percent" | "amount" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Amount ($)</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeId">Store</Label>
                <Select
                  value={newDiscount.storeId?.toString() || "all"}
                  onValueChange={(value) => setNewDiscount(prev => ({
                    ...prev,
                    storeId: value === "all" ? null : parseInt(value)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores?.map((store: Store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="restrictedAccess"
                  checked={newDiscount.restrictedAccess}
                  onCheckedChange={(checked) => setNewDiscount(prev => ({ ...prev, restrictedAccess: checked }))}
                />
                <Label htmlFor="restrictedAccess">Restricted Access</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDiscountDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addDiscountMutation.isPending}>
                {addDiscountMutation.isPending ? "Adding..." : "Add Discount"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Discount Dialog */}
      <Dialog open={isEditDiscountDialogOpen} onOpenChange={setIsEditDiscountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Discount</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditDiscount}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Discount Name*</Label>
                <Input
                  id="editName"
                  value={selectedDiscount?.name || ''}
                  onChange={(e) => setSelectedDiscount(prev => prev ? {...prev, name: e.target.value} : null)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editValue">Value*</Label>
                  <Input
                    id="editValue"
                    type="number"
                    step={selectedDiscount?.type === "percent" ? "1" : "0.01"}
                    min="0"
                    max={selectedDiscount?.type === "percent" ? "100" : undefined}
                    value={selectedDiscount?.value || 0}
                    onChange={(e) => setSelectedDiscount(prev => prev ? {
                      ...prev,
                      value: e.target.value // Keep as string to avoid conversion issues
                    } : null)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editType">Type*</Label>
                  <Select
                    value={selectedDiscount?.type || 'amount'}
                    onValueChange={(value) => setSelectedDiscount(prev => prev ? {...prev, type: value as "percent" | "amount"} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Amount ($)</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editStoreId">Store</Label>
                <Select
                  value={selectedDiscount?.storeId?.toString() || "all"}
                  onValueChange={(value) => setSelectedDiscount(prev => prev ? {
                    ...prev,
                    storeId: value === "all" ? null : parseInt(value)
                  } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores?.map((store: Store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="editRestrictedAccess"
                  checked={selectedDiscount?.restrictedAccess || false}
                  onCheckedChange={(checked) => setSelectedDiscount(prev => prev ? {...prev, restrictedAccess: checked} : null)}
                />
                <Label htmlFor="editRestrictedAccess">Restricted Access</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDiscountDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDiscountMutation.isPending}>
                {updateDiscountMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Discount Dialog */}
      <AlertDialog open={isDeleteDiscountDialogOpen} onOpenChange={setIsDeleteDiscountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this discount? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDiscount}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
