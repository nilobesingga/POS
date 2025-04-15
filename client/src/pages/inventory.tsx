import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product, InsertProduct, Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  
  // Form state for new product
  const [newProduct, setNewProduct] = useState<Partial<InsertProduct>>({
    name: "",
    price: 0,
    description: "",
    categoryId: undefined,
    imageUrl: "",
    sku: "",
    inStock: true,
    stockQuantity: 0
  });
  
  // Form state for new category
  const [newCategory, setNewCategory] = useState({
    name: ""
  });
  
  // Fetch products
  const { 
    data: products, 
    isLoading: isLoadingProducts,
    isError: isProductsError 
  } = useQuery({
    queryKey: ["/api/products"],
  });
  
  // Fetch categories
  const { 
    data: categories, 
    isLoading: isLoadingCategories,
    isError: isCategoriesError 
  } = useQuery({
    queryKey: ["/api/categories"],
  });
  
  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (product: InsertProduct) => {
      const response = await apiRequest("POST", "/api/products", product);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddProductDialogOpen(false);
      resetProductForm();
      toast({
        title: "Product Added",
        description: "The product has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add product",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (category: { name: string }) => {
      const response = await apiRequest("POST", "/api/categories", category);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsAddCategoryDialogOpen(false);
      setNewCategory({ name: "" });
      toast({
        title: "Category Added",
        description: "The category has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add category",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Update product stock status mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<InsertProduct> }) => {
      const response = await apiRequest("PATCH", `/api/products/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Updated",
        description: "The product has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update product",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Handle product form change
  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "price" || name === "stockQuantity") {
      setNewProduct(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle stock status toggle
  const handleStockStatusChange = (checked: boolean) => {
    setNewProduct(prev => ({
      ...prev,
      inStock: checked
    }));
  };
  
  // Handle category form change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategory({ name: e.target.value });
  };
  
  // Reset product form
  const resetProductForm = () => {
    setNewProduct({
      name: "",
      price: 0,
      description: "",
      categoryId: undefined,
      imageUrl: "",
      sku: "",
      inStock: true,
      stockQuantity: 0
    });
  };
  
  // Handle product form submission
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newProduct.name || !newProduct.price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Submit form
    addProductMutation.mutate(newProduct as InsertProduct);
  };
  
  // Handle category form submission
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newCategory.name) {
      toast({
        title: "Validation Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }
    
    // Submit form
    addCategoryMutation.mutate(newCategory);
  };
  
  // Handle stock update
  const handleStockUpdate = (product: Product, quantity: number) => {
    updateProductMutation.mutate({
      id: product.id,
      updates: {
        stockQuantity: quantity,
        inStock: quantity > 0
      }
    });
  };
  
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Inventory Management</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setIsAddCategoryDialogOpen(true)}>
            Add Category
          </Button>
          <Button onClick={() => setIsAddProductDialogOpen(true)}>
            Add Product
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          {isLoadingProducts ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array(6).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-5 w-1/4" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isProductsError ? (
            <div className="text-center py-10">
              <p className="text-red-500">Failed to load products. Please try again.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {products && products.map((product: Product) => (
                <Card key={product.id}>
                  <CardHeader className="p-4">
                    <CardTitle>{product.name}</CardTitle>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Price:</span>
                      <span className="font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Stock:</span>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleStockUpdate(product, Math.max(0, product.stockQuantity - 1))}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </Button>
                        <span className="w-10 text-center font-medium">{product.stockQuantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleStockUpdate(product, product.stockQuantity + 1)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="categories">
          {isLoadingCategories ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array(4).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="p-4">
                    <Skeleton className="h-6 w-1/2" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-5 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isCategoriesError ? (
            <div className="text-center py-10">
              <p className="text-red-500">Failed to load categories. Please try again.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {categories && categories.map((category: Category) => (
                <Card key={category.id}>
                  <CardHeader className="p-4">
                    <CardTitle>{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-gray-500">ID: {category.id}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add Product Dialog */}
      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddProduct}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name*</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newProduct.name}
                    onChange={handleProductChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price*</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={handleProductChange}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newProduct.description}
                  onChange={handleProductChange}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    name="categoryId"
                    value={newProduct.categoryId?.toString() || ""}
                    onValueChange={(value) => setNewProduct(prev => ({ ...prev, categoryId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories && categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={newProduct.sku}
                    onChange={handleProductChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={newProduct.imageUrl}
                    onChange={handleProductChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Stock Quantity</Label>
                  <Input
                    id="stockQuantity"
                    name="stockQuantity"
                    type="number"
                    value={newProduct.stockQuantity}
                    onChange={handleProductChange}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="inStock" 
                  checked={newProduct.inStock} 
                  onCheckedChange={handleStockStatusChange} 
                />
                <Label htmlFor="inStock">In Stock</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addProductMutation.isPending}>
                {addProductMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddCategory}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name*</Label>
                <Input
                  id="categoryName"
                  value={newCategory.name}
                  onChange={handleCategoryChange}
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addCategoryMutation.isPending}>
                {addCategoryMutation.isPending ? "Adding..." : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
