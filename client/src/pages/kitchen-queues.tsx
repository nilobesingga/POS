import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, Settings2, BellRing } from "lucide-react";

// Type definitions
interface KitchenQueue {
  id: number;
  name: string;
  storeId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedProducts?: AssignedProduct[];
}

interface AssignedProduct {
  assignmentId: number;
  product: {
    id: number;
    name: string;
    categoryId: number | null;
  }
}

interface Product {
  id: number;
  name: string;
  categoryId: number | null;
  category?: {
    name: string;
  }
}

interface Store {
  id: number;
  name: string;
  branch?: string;
}

export default function KitchenQueuesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddQueueModalOpen, setIsAddQueueModalOpen] = useState(false);
  const [isEditQueueModalOpen, setIsEditQueueModalOpen] = useState(false);
  const [isManageProductsModalOpen, setIsManageProductsModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<KitchenQueue | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newQueue, setNewQueue] = useState({
    name: "",
    storeId: "",
    isActive: true
  });

  // Product assignment state
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Update document title
  useEffect(() => {
    document.title = "Kitchen Queues | POS System";
  }, []);

  // Fetch all kitchen queues
  const {
    data: kitchenQueues,
    isLoading: isLoadingQueues,
    isError: isQueuesError,
    refetch: refetchQueues
  } = useQuery({
    queryKey: ["/api/kitchen/queues"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/kitchen/queues");
      return response.json();
    }
  });

  // Fetch all stores
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

  // Fetch all products
  const {
    data: products,
    isLoading: isLoadingProducts
  } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      return response.json();
    }
  });

  // Fetch all categories
  const {
    data: categories,
    isLoading: isLoadingCategories
  } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories");
      return response.json();
    }
  });

  // Mutations
  const addQueueMutation = useMutation({
    mutationFn: async (queueData: { name: string; storeId: number; isActive: boolean }) => {
      const response = await apiRequest("POST", "/api/kitchen/queues", queueData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/queues"] });
      setIsAddQueueModalOpen(false);
      resetNewQueueForm();
      toast({
        title: "Success",
        description: "Kitchen queue created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create kitchen queue",
        variant: "destructive"
      });
    }
  });

  const updateQueueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; storeId: number; isActive: boolean } }) => {
      const response = await apiRequest("PUT", `/api/kitchen/queues/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/queues"] });
      setIsEditQueueModalOpen(false);
      toast({
        title: "Success",
        description: "Kitchen queue updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update kitchen queue",
        variant: "destructive"
      });
    }
  });

  const deleteQueueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/kitchen/queues/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/queues"] });
      toast({
        title: "Success",
        description: "Kitchen queue deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete kitchen queue",
        variant: "destructive"
      });
    }
  });

  const assignProductMutation = useMutation({
    mutationFn: async ({ productId, queueId }: { productId: number; queueId: number }) => {
      const response = await apiRequest("POST", "/api/kitchen/queues/assignments", {
        productId,
        queueId
      });
      return response.json();
    },
    onSuccess: () => {
      // No need to close modal, just refresh the queue details
      if (selectedQueue) {
        fetchQueueDetails(selectedQueue.id);
      }
      toast({
        title: "Success",
        description: "Product assigned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to assign product",
        variant: "destructive"
      });
    }
  });

  const removeProductMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await apiRequest("DELETE", `/api/kitchen/queues/assignments/${assignmentId}`);
      return response.json();
    },
    onSuccess: () => {
      // Refresh queue details
      if (selectedQueue) {
        fetchQueueDetails(selectedQueue.id);
      }
      toast({
        title: "Success",
        description: "Product removed from queue",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove product",
        variant: "destructive"
      });
    }
  });

  // Helper functions
  const fetchQueueDetails = async (queueId: number) => {
    try {
      const response = await apiRequest("GET", `/api/kitchen/queues/${queueId}`);
      const queueDetails = await response.json();
      setSelectedQueue(queueDetails);

      // Update available products list - remove already assigned products
      if (products) {
        const assignedProductIds = queueDetails.assignedProducts?.map((ap: AssignedProduct) => ap.product.id) || [];
        setAvailableProducts(products.filter((product: Product) => !assignedProductIds.includes(product.id)));
      }
    } catch (error) {
      console.error("Error fetching queue details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch queue details",
        variant: "destructive"
      });
    }
  };

  const resetNewQueueForm = () => {
    setNewQueue({
      name: "",
      storeId: "",
      isActive: true
    });
  };

  const handleAddQueue = () => {
    if (!newQueue.name || !newQueue.storeId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    addQueueMutation.mutate({
      name: newQueue.name,
      storeId: parseInt(newQueue.storeId),
      isActive: newQueue.isActive
    });
  };

  const handleUpdateQueue = () => {
    if (!selectedQueue || !selectedQueue.name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    updateQueueMutation.mutate({
      id: selectedQueue.id,
      data: {
        name: selectedQueue.name,
        storeId: selectedQueue.storeId,
        isActive: selectedQueue.isActive
      }
    });
  };

  const handleDeleteQueue = (id: number) => {
    if (window.confirm("Are you sure you want to delete this kitchen queue? This action cannot be undone.")) {
      deleteQueueMutation.mutate(id);
    }
  };

  const openEditModal = (queue: KitchenQueue) => {
    setSelectedQueue(queue);
    setIsEditQueueModalOpen(true);
  };

  const openManageProductsModal = async (queue: KitchenQueue) => {
    await fetchQueueDetails(queue.id);
    setIsManageProductsModalOpen(true);
  };

  const handleAssignProducts = () => {
    if (!selectedQueue || selectedProducts.length === 0) return;

    // We'll sequentially assign products to avoid potential race conditions
    const assignProducts = async () => {
      for (const productId of selectedProducts) {
        await assignProductMutation.mutateAsync({
          productId,
          queueId: selectedQueue.id
        });
      }
      setSelectedProducts([]);
    };

    assignProducts().catch(console.error);
  };

  const handleRemoveProduct = (assignmentId: number) => {
    removeProductMutation.mutate(assignmentId);
  };

  // Filter kitchen queues based on search
  const filteredQueues = kitchenQueues?.filter((queue: KitchenQueue) =>
    queue.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter available products based on search and category filter
  const filteredAvailableProducts = availableProducts?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || product.categoryId?.toString() === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get store name by ID
  const getStoreName = (storeId: number) => {
    const store = stores?.find((s: Store) => s.id === storeId);
    return store ? `${store.name}${store.branch ? ` (${store.branch})` : ''}` : 'Unknown Store';
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "No Category";
    const category = categories?.find((c: { id: number; name: string }) => c.id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kitchen Queues</h1>
        <Button onClick={() => setIsAddQueueModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Queue
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            className="pl-10"
            placeholder="Search queues..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Kitchen Queues List */}
      {isLoadingQueues ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isQueuesError ? (
        <Card className="bg-red-50">
          <CardContent className="pt-6 text-red-500">
            Failed to load kitchen queues. Please try again.
          </CardContent>
        </Card>
      ) : filteredQueues && filteredQueues.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="pt-6 text-center text-gray-500">
            No kitchen queues found. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQueues?.map((queue: KitchenQueue) => (
            <Card key={queue.id} className="shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <BellRing className="w-5 h-5 mr-2 text-amber-500" />
                      {queue.name}
                    </CardTitle>
                    <CardDescription>{getStoreName(queue.storeId)}</CardDescription>
                  </div>
                  <Badge variant={queue.isActive ? "default" : "outline"}>
                    {queue.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {/* Add placeholder for queue stats if needed */}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openManageProductsModal(queue)}
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Manage Products
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(queue)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteQueue(queue.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Queue Modal */}
      <Dialog open={isAddQueueModalOpen} onOpenChange={setIsAddQueueModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Kitchen Queue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Queue Name</Label>
              <Input
                id="name"
                value={newQueue.name}
                onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
                placeholder="e.g., Hot Kitchen, Bar, Cold Items"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store">Store</Label>
              <Select
                value={newQueue.storeId}
                onValueChange={(value) => setNewQueue({ ...newQueue, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((store: Store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name} {store.branch ? `(${store.branch})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={newQueue.isActive}
                onCheckedChange={(checked) =>
                  setNewQueue({ ...newQueue, isActive: checked === true })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddQueueModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQueue} disabled={addQueueMutation.isPending}>
              {addQueueMutation.isPending ? "Creating..." : "Create Queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Queue Modal */}
      <Dialog open={isEditQueueModalOpen} onOpenChange={setIsEditQueueModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Kitchen Queue</DialogTitle>
          </DialogHeader>
          {selectedQueue && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Queue Name</Label>
                <Input
                  id="edit-name"
                  value={selectedQueue.name}
                  onChange={(e) => setSelectedQueue({ ...selectedQueue, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-store">Store</Label>
                <Select
                  value={selectedQueue.storeId.toString()}
                  onValueChange={(value) =>
                    setSelectedQueue({ ...selectedQueue, storeId: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores?.map((store: Store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name} {store.branch ? `(${store.branch})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isActive"
                  checked={selectedQueue.isActive}
                  onCheckedChange={(checked) =>
                    setSelectedQueue({ ...selectedQueue, isActive: checked === true })
                  }
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditQueueModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQueue} disabled={updateQueueMutation.isPending}>
              {updateQueueMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Products Modal */}
      <Dialog open={isManageProductsModalOpen} onOpenChange={setIsManageProductsModalOpen}>
        <DialogContent className="min-w-[80vw]">
          <DialogHeader>
            <DialogTitle>
              Manage Products for {selectedQueue?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-hidden">
            {/* Left Side - Available Products */}
            <div className="border rounded-md overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium mb-2">Available Products</h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      className="pl-8"
                      placeholder="Search products..."
                      value={productSearchQuery}
                      onChange={e => setProductSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select
                    value={filterCategory}
                    onValueChange={setFilterCategory}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((category: { id: number; name: string }) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAvailableProducts?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          No available products found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAvailableProducts?.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProducts([...selectedProducts, product.id]);
                                } else {
                                  setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <Button
                  onClick={handleAssignProducts}
                  disabled={selectedProducts.length === 0}
                >
                  Assign Selected Products
                </Button>
              </div>
            </div>

            {/* Right Side - Assigned Products */}
            <div className="border rounded-md overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium">Assigned Products</h3>
              </div>
              <div className="overflow-y-auto flex-1 max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!selectedQueue?.assignedProducts || selectedQueue?.assignedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          No products assigned to this queue yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedQueue?.assignedProducts.map((item) => (
                        <TableRow key={item.assignmentId}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell>{getCategoryName(item.product.categoryId)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleRemoveProduct(item.assignmentId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsManageProductsModalOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
