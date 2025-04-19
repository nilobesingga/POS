import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Product, InsertProduct, Category, StoreSettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, ChevronDown, Search, X, MoreHorizontal, Edit, Layers, Store, ListPlus, Trash, AlertTriangle, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/hooks/use-currency";
import { useNavigationFetch } from "@/hooks/use-navigation-fetch";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/ui/access-control";

export default function InventoryPage() {
  const { toast } = useToast();
  const { format, parse, parseNumber } = useCurrency();
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("items");

  // Get user permissions
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();

  // Dialog states
  const [isProductDetailDialogOpen, setIsProductDetailDialogOpen] = useState(false);
  const [isVariantsDialogOpen, setIsVariantsDialogOpen] = useState(false);
  const [isStoresDialogOpen, setIsStoresDialogOpen] = useState(false);
  const [isModifiersDialogOpen, setIsModifiersDialogOpen] = useState(false);
  const [isAllergensDialogOpen, setIsAllergensDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Variant state
  const [newVariant, setNewVariant] = useState({
    optionName: '',
    optionValue: '',
    price: '',
    cost: '',
    sku: '',
    barcode: '',
    stockQuantity: 0
  });
  const [productVariants, setProductVariants] = useState<any[]>([]);

  // Store availability state
  const [productStores, setProductStores] = useState<any[]>([]);

  // Modifiers state
  const [productModifiers, setProductModifiers] = useState<any[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<any[]>([]);

  // Allergens state
  const [productAllergens, setProductAllergens] = useState<{id?: number, name: string, severity: "mild" | "moderate" | "severe"}[]>([]);
  const [selectedAllergenId, setSelectedAllergenId] = useState<number | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<"mild" | "moderate" | "severe">("moderate");

  // Table state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStore, setFilterStore] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingItem, setEditingItem] = useState<{ id: number, field: string, value: string | number } | null>(null);

  // Form state for new product
  const [newProduct, setNewProduct] = useState<Partial<InsertProduct>>({
    name: "",
    price: "0",
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

  // Use our custom hook for automatic data fetching on navigation
  const {
    data: products,
    loading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts
  } = useNavigationFetch<Product[]>({
    fetchFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      return response.json();
    }
  });

  // Use our custom hook for categories as well
  const {
    data: categories,
    loading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useNavigationFetch<Category[]>({
    fetchFn: async () => {
      const response = await apiRequest("GET", "/api/categories");
      return response.json();
    }
  });

  // Use our custom hook for store settings
  const {
    data: stores,
    loading: isLoadingStores,
  } = useNavigationFetch<StoreSettings[]>({
    fetchFn: async () => {
      const response = await apiRequest("GET", "/api/store-settings");
      return response.json();
    }
  });

  // Use our custom hook for modifiers
  const {
    data: modifiers,
    loading: isLoadingModifiers,
  } = useNavigationFetch<any[]>({
    fetchFn: async () => {
      const response = await apiRequest("GET", "/api/modifiers");
      return response.json();
    }
  });

  // Use our custom hook for allergens
  const {
    data: allergensList,
    loading: isLoadingAllergens
  } = useNavigationFetch<any[]>({
    fetchFn: async () => {
      const response = await apiRequest("GET", "/api/allergens");
      return response.json();
    }
  });

  // Display errors from fetching data
  useEffect(() => {
    if (productsError) {
      toast({
        title: "Error loading products",
        description: productsError.message,
        variant: "destructive"
      });
    }

    if (categoriesError) {
      toast({
        title: "Error loading categories",
        description: categoriesError.message,
        variant: "destructive"
      });
    }
  }, [productsError, categoriesError, toast]);

  // Effect to set default tab based on permissions
  useEffect(() => {
    if (isLoadingPermissions) return;

    if (hasPermission("canManageProducts")) {
      setActiveTab("items");
    } else if (hasPermission("canManageCategories")) {
      setActiveTab("categories");
    }
  }, [hasPermission, isLoadingPermissions]);

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (product: InsertProduct) => {
      // Format the request body with the product in a nested object as expected by the API
      const requestBody = {
        product,
        variants: [],
        stores: [],
        modifiers: []
      };

      const response = await apiRequest("POST", "/api/products", requestBody);
      return response.json();
    },
    onSuccess: async (newProduct) => {
      // Apply modifiers to the created product
      if (productModifiers.length > 0) {
        try {
          await Promise.all(productModifiers.map(modifier =>
            apiRequest("POST", `/api/products/${newProduct.id}/modifiers`, {
              modifierId: modifier.modifierId
            })
          ));

          toast({
            title: "Modifiers Added",
            description: `${productModifiers.length} modifiers have been linked to the product`,
          });
        } catch (error) {
          console.error("Error adding modifiers:", error);
          toast({
            title: "Warning",
            description: "Product was created, but there was an issue adding modifiers",
            variant: "warning"
          });
        }
      }

      // Instead of invalidating the query, we refetch the data
      refetchProducts();
      setIsAddProductDialogOpen(false);
      resetProductForm();
      setProductModifiers([]);
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
      // Instead of invalidating the query, we refetch the data
      refetchCategories();
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

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<InsertProduct> }) => {
      const response = await apiRequest("PATCH", `/api/products/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      // Instead of invalidating the query, we refetch the data
      refetchProducts();
      setEditingItem(null);
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

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/products/${id}`);
      return response.json();
    },
    onSuccess: () => {
      // Instead of invalidating the query, we refetch the data
      refetchProducts();
      setIsDeleteConfirmDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Product Deleted",
        description: "The product has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete product",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Add product variant mutation
  const addVariantMutation = useMutation({
    mutationFn: async ({ productId, variant }: { productId: number, variant: any }) => {
      const response = await apiRequest("POST", `/api/products/${productId}/variants`, variant);
      return response.json();
    },
    onSuccess: (data) => {
      setProductVariants(prev => [...prev, data]);
      setNewVariant({
        optionName: '',
        optionValue: '',
        price: '',
        cost: '',
        sku: '',
        barcode: '',
        stockQuantity: 0
      });
      toast({
        title: "Variant Added",
        description: "The product variant has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add variant",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: async ({ productId, variantId }: { productId: number, variantId: number }) => {
      const response = await apiRequest("DELETE", `/api/products/${productId}/variants/${variantId}`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      setProductVariants(prev => prev.filter(v => v.id !== variables.variantId));
      toast({
        title: "Variant Deleted",
        description: "The product variant has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete variant",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update store availability mutation
  const updateStoreAvailabilityMutation = useMutation({
    mutationFn: async ({ productId, storeId, isAvailable }: { productId: number, storeId: number, isAvailable: boolean }) => {
      const response = await apiRequest("POST", `/api/products/${productId}/stores`, { storeId, isAvailable });
      return response.json();
    },
    onSuccess: (data) => {
      setProductStores(prev => {
        const index = prev.findIndex(s => s.id === data.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [...prev, data];
      });
      toast({
        title: "Store Availability Updated",
        description: "The product's store availability has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update availability",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Add modifier link mutation
  const addModifierLinkMutation = useMutation({
    mutationFn: async ({ productId, modifierId }: { productId: number, modifierId: number }) => {
      const response = await apiRequest("POST", `/api/products/${productId}/modifiers`, { modifierId });
      return response.json();
    },
    onSuccess: (data) => {
      // Find the modifier details from available modifiers
      const modifier = availableModifiers.find(m => m.id === data.modifierId);
      if (modifier) {
        setProductModifiers(prev => [...prev, { ...data, name: modifier.name }]);
      }
      toast({
        title: "Modifier Added",
        description: "The modifier has been linked to the product",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add modifier",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Remove modifier link mutation
  const removeModifierLinkMutation = useMutation({
    mutationFn: async ({ productId, modifierId }: { productId: number, modifierId: number }) => {
      const response = await apiRequest("DELETE", `/api/products/${productId}/modifiers/${modifierId}`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      setProductModifiers(prev => prev.filter(m => m.modifierId !== variables.modifierId));
      toast({
        title: "Modifier Removed",
        description: "The modifier has been unlinked from the product",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove modifier",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update allergens mutation
  const updateAllergensMutation = useMutation({
    mutationFn: async ({ id, allergenData }: { id: number, allergenData: { hasAllergens: boolean, allergens: any[] } }) => {
      const response = await apiRequest("PATCH", `/api/products/${id}`, allergenData);
      return response.json();
    },
    onSuccess: () => {
      refetchProducts();
      setIsAllergensDialogOpen(false);
      toast({
        title: "Allergens Updated",
        description: "The product allergen information has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update allergens",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Load product allergen information when the dialog is opened
  const loadProductAllergens = (product: Product) => {
    if (product.hasAllergens && product.allergens && Array.isArray(product.allergens)) {
      setProductAllergens(product.allergens as {id?: number, name: string, severity: "mild" | "moderate" | "severe"}[]);
    } else {
      setProductAllergens([]);
    }
  };

  // Handle selecting an allergen from the dropdown
  const handleAllergenSelect = (allergenId: string) => {
    const id = parseInt(allergenId);
    setSelectedAllergenId(id);

    // Find the selected allergen from the list
    const selectedAllergen: { id: number; name: string; severity: "mild" | "moderate" | "severe" } | undefined = allergensList?.find((a: { id: number; name: string; severity: string }) => a.id === id);
    if (selectedAllergen) {
      // Set the default severity from the selected allergen
      setSelectedSeverity(selectedAllergen.severity as "mild" | "moderate" | "severe");
    }
  };

  // Handle adding a selected allergen to the product
  const handleAddSelectedAllergen = () => {
    if (!selectedAllergenId) {
      toast({
        title: "Validation Error",
        description: "Please select an allergen",
        variant: "destructive"
      });
      return;
    }

    // Check if already added
    const isAlreadyAdded = productAllergens.some(a => a.id === selectedAllergenId);
    if (isAlreadyAdded) {
      toast({
        title: "Allergen Already Added",
        description: "This allergen is already added to the product",
        variant: "destructive"
      });
      return;
    }

    // Find the allergen details from the list
    const allergen = allergensList?.find((a: { id: number; name: string; severity: string }) => a.id === selectedAllergenId);
    if (allergen) {
      setProductAllergens([...productAllergens, {
        id: allergen.id,
        name: allergen.name,
        severity: selectedSeverity
      }]);

      // Reset selection
      setSelectedAllergenId(null);
    }
  };

  const handleRemoveAllergen = (index: number) => {
    const updatedAllergens = [...productAllergens];
    updatedAllergens.splice(index, 1);
    setProductAllergens(updatedAllergens);
  };

  const saveAllergens = () => {
    if (!selectedProduct) return;

    updateAllergensMutation.mutate({
      id: selectedProduct.id,
      allergenData: {
        hasAllergens: productAllergens.length > 0,
        allergens: productAllergens
      }
    });
  };

  // Filter and paginate products
  const filteredProducts = products ? products.filter((product: Product) => {
    const matchesSearch = searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === null || product.categoryId === filterCategory;

    const matchesStockAlert = !showStockAlerts || product.stockQuantity <= 5;

    return matchesSearch && matchesCategory && matchesStockAlert;
  }) : [];

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Handle page change
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Handle product form change
  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "price") {
      setNewProduct(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === "stockQuantity") {
      setNewProduct(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        [name]: value || "" // Ensure nullable fields are converted to empty string instead of null
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
      price: "0",
      description: "",
      categoryId: undefined,
      imageUrl: "",
      sku: "",
      inStock: true,
      stockQuantity: 0
    });
  };

  // Load modifiers when opening the Add New Item dialog
  useEffect(() => {
    if (isAddProductDialogOpen && !availableModifiers.length && !isLoadingModifiers) {
      // Fetch modifiers for the "Add New Item" dialog
      const fetchModifiers = async () => {
        try {
          const response = await apiRequest("GET", "/api/modifiers");
          const data = await response.json();
          setAvailableModifiers(data || []);
        } catch (error) {
          toast({
            title: "Failed to load modifiers",
            description: "Could not load available modifiers",
            variant: "destructive"
          });
        }
      };

      fetchModifiers();
    }
  }, [isAddProductDialogOpen, availableModifiers.length, isLoadingModifiers, toast]);

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

    // Format data for submission
    const productToSubmit = {
      ...newProduct,
      price: newProduct.price.toString(),
      description: newProduct.description || "",
      imageUrl: newProduct.imageUrl || "",
      sku: newProduct.sku || "",
      stockQuantity: Number(newProduct.stockQuantity)
    };

    // Submit form with properly formatted data object
    addProductMutation.mutate(productToSubmit as InsertProduct);
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

  // Start inline editing
  const startEditing = (id: number, field: string, value: string | number) => {
    setEditingItem({ id, field, value });
  };

  // Handle edit change
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parse(e.target.value);
    setEditingItem(prev => prev ? { ...prev, value } : null);
  };

  // Cancel inline editing
  const cancelEditing = () => {
    setEditingItem(null);
  };

  // Save inline edit
  const saveEdit = (id: number) => {
    if (!editingItem) return;

    const updates: Partial<InsertProduct> = {};

    switch (editingItem.field) {
      case 'price':
      case 'cost':
        updates[editingItem.field] = parseNumber(editingItem.value.toString()).toString();
        break;
      case 'stockQuantity':
        const stockQty = parseInt(editingItem.value.toString());
        updates.stockQuantity = stockQty;
        updates.inStock = stockQty > 0;
        break;
      case 'name':
      case 'description':
      case 'barcode':
      case 'sku':
      case 'imageUrl':
        updates[editingItem.field] = editingItem.value.toString();
        break;
    }

    updateProductMutation.mutate({ id, updates });
  };

  // Calculate margin
  const calculateMargin = (price: number | string, cost: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const numCost = typeof cost === 'string' ? parseFloat(cost) : cost || 0;

    if (!numPrice || !numCost) return '0.00%';

    const margin = ((numPrice - numCost) / numPrice) * 100;
    return margin.toFixed(2) + '%';
  };

  // Get category name by id
  const getCategoryName = (categoryId: number | null | undefined): string => {
    if (!categoryId || !categories) return '-';
    const category = categories.find((cat: Category) => cat.id === categoryId);
    return category ? category.name : '-';
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterCategory(null);
    setFilterStore(null);
    setShowStockAlerts(false);
  };

  // Effect to reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStore, showStockAlerts]);

  // Handler functions
  const openProductDetailDialog = (product: Product) => {
    setSelectedProduct(product);
    // Pre-fill form with selected product details
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      cost: product.cost ? product.cost.toString() : '',
      barcode: product.barcode || '',
      description: product.description || '',
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || '',
      sku: product.sku || '',
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      soldBy: product.soldBy || 'each',
      isTaxable: product.isTaxable !== false, // default to true if undefined
    });
    setIsProductDetailDialogOpen(true);
  };

  const openVariantsDialog = async (product: Product) => {
    setSelectedProduct(product);

    // Fetch product variants
    try {
      const response = await apiRequest("GET", `/api/products/${product.id}`);
      const data = await response.json();
      setProductVariants(data.variants || []);
      setIsVariantsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Failed to load variants",
        description: "Could not load product variants",
        variant: "destructive"
      });
    }
  };

  const openStoresDialog = async (product: Product) => {
    setSelectedProduct(product);

    // Fetch product-store relationships
    try {
      const response = await apiRequest("GET", `/api/products/${product.id}`);
      const data = await response.json();
      setProductStores(data.stores || []);
      setIsStoresDialogOpen(true);
    } catch (error) {
      toast({
        title: "Failed to load store relationships",
        description: "Could not load product store availability",
        variant: "destructive"
      });
    }
  };

  const openModifiersDialog = async (product: Product) => {
    setSelectedProduct(product);

    // Fetch product-modifier relationships and available modifiers
    try {
      // First get product modifiers
      const productResponse = await apiRequest("GET", `/api/products/${product.id}`);
      const productData = await productResponse.json();

      // Then get all available modifiers
      const modifiersResponse = await apiRequest("GET", "/api/modifiers");
      const modifiersData = await modifiersResponse.json();
      setAvailableModifiers(modifiersData || []);

      // Now enhance the product modifiers with names from the modifiers list
      const enhancedModifiers = (productData.modifiers || []).map((modifier: { id: number; modifierId: number }) => {
        const matchingModifier = modifiersData.find((m: { id: number; name: string }) => m.id === modifier.modifierId);
        return {
          ...modifier,
          name: matchingModifier ? matchingModifier.name : `Modifier #${modifier.modifierId}`
        };
      });

      setProductModifiers(enhancedModifiers);
      setIsModifiersDialogOpen(true);
    } catch (error) {
      toast({
        title: "Failed to load modifiers",
        description: "Could not load product modifiers",
        variant: "destructive"
      });
    }
  };

  const openAllergensDialog = async (product: Product) => {
    setSelectedProduct(product);
    loadProductAllergens(product);
    setIsAllergensDialogOpen(true);
  };

  const openDeleteConfirmDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteConfirmDialogOpen(true);
  };

  const handleDeleteProduct = () => {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.id);
    }
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVariant(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!newVariant.optionName || !newVariant.optionValue) {
      toast({
        title: "Validation Error",
        description: "Option name and value are required",
        variant: "destructive"
      });
      return;
    }

    // Only send the required fields to avoid validation errors
    const variantToSubmit = {
      optionName: newVariant.optionName,
      optionValue: newVariant.optionValue,
    };

    addVariantMutation.mutate({
      productId: selectedProduct.id,
      variant: variantToSubmit
    });
  };

  const handleDeleteVariant = (variantId: number) => {
    if (!selectedProduct) return;
    deleteVariantMutation.mutate({
      productId: selectedProduct.id,
      variantId
    });
  };

  const handleToggleStoreAvailability = (storeId: number, currentAvailability: boolean) => {
    if (!selectedProduct) return;
    updateStoreAvailabilityMutation.mutate({
      productId: selectedProduct.id,
      storeId,
      isAvailable: !currentAvailability
    });
  };

  const handleAddModifier = (modifierId: number) => {
    if (!selectedProduct) return;
    addModifierLinkMutation.mutate({
      productId: selectedProduct.id,
      modifierId
    });
  };

  const handleRemoveModifier = (modifierId: number) => {
    if (!selectedProduct) return;
    removeModifierLinkMutation.mutate({
      productId: selectedProduct.id,
      modifierId
    });
  };

  const updateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // Validate form
    if (!newProduct.name || !newProduct.price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Format and submit data
    updateProductMutation.mutate({
      id: selectedProduct.id,
      updates: newProduct as Partial<InsertProduct>
    });

    setIsProductDetailDialogOpen(false);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Item List</h1>
        <div className="flex space-x-2">
          <PermissionGuard requiredPermission="canManageCategories">
            <Button onClick={() => setIsAddCategoryDialogOpen(true)}>
              Add Category
            </Button>
          </PermissionGuard>
          <PermissionGuard requiredPermission="canManageProducts">
            <Button onClick={() => setIsAddProductDialogOpen(true)}>
              Add Item
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {isLoadingPermissions ? (
        <div className="space-y-2">
          {Array(3).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {hasPermission("canManageProducts") && (
              <TabsTrigger value="items">Items</TabsTrigger>
            )}
            {hasPermission("canManageCategories") && (
              <TabsTrigger value="categories">Categories</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="items">
            <PermissionGuard requiredPermission="canManageProducts">
              <div className="mb-4 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between">
                  {/* Search input */}
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Store filter */}
                    {stores && stores.length > 1 && (
                      <Select
                        value={filterStore?.toString() || ""}
                        onValueChange={(value) => setFilterStore(value ? parseInt(value) : null)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by Store" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stores</SelectItem>
                          {stores.map((store: StoreSettings) => (
                            <SelectItem key={store.id} value={store.id.toString()}>
                              {store.name} {store.branch ? `- ${store.branch}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Category filter */}
                    <Select
                      value={filterCategory?.toString() || ""}
                      onValueChange={(value) => setFilterCategory(value === 'all' ? null : parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories && categories.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Stock alerts filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          Stock Filters
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuCheckboxItem
                          checked={showStockAlerts}
                          onCheckedChange={setShowStockAlerts}
                        >
                          Show Low Stock Items
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Reset filters */}
                    {(searchTerm || filterCategory || filterStore || showStockAlerts) && (
                      <Button variant="ghost" onClick={resetFilters} className="h-10">
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>

                {/* Active filters display */}
                {(filterCategory || showStockAlerts) && (
                  <div className="flex flex-wrap gap-2">
                    {filterCategory && (
                      <Badge variant="outline" className="flex gap-1 items-center">
                        Category: {getCategoryName(filterCategory)}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilterCategory(null)}
                        />
                      </Badge>
                    )}
                    {showStockAlerts && (
                      <Badge variant="outline" className="flex gap-1 items-center">
                        Low Stock Only
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setShowStockAlerts(false)}
                        />
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {isLoadingProducts ? (
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </div>
              ) : productsError ? (
                <div className="text-center py-10">
                  <p className="text-red-500">Failed to load items. Please try again.</p>
                </div>
              ) : (
                <>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Margin</TableHead>
                          <TableHead>In Stock</TableHead>
                          <TableHead>Sold By</TableHead>
                          <TableHead>Taxable</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
                              No items found. Try adjusting your filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentItems.map((product: Product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                              <TableCell>{product.barcode || '-'}</TableCell>
                              <TableCell>
                                {hasPermission("canManageProducts") ? (
                                  editingItem && editingItem.id === product.id && editingItem.field === 'price' ? (
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="text"
                                        value={editingItem.value}
                                        onChange={handleEditChange}
                                        className="h-8 w-24"
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => saveEdit(product.id)}
                                        className="h-8 w-8 p-0"
                                        title="Save"
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEditing}
                                        className="h-8 w-8 p-0"
                                        title="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => startEditing(product.id, 'price', format(Number(product.price)))}
                                      className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                    >
                                      {format(Number(product.price))}
                                    </div>
                                  )
                                ) : (
                                  <div className="px-2 py-1">{format(Number(product.price))}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                {hasPermission("canManageProducts") ? (
                                  editingItem && editingItem.id === product.id && editingItem.field === 'cost' ? (
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="text"
                                        value={editingItem.value}
                                        onChange={handleEditChange}
                                        className="h-8 w-24"
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => saveEdit(product.id)}
                                        className="h-8 w-8 p-0"
                                        title="Save"
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEditing}
                                        className="h-8 w-8 p-0"
                                        title="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => startEditing(product.id, 'cost', format(Number(product.cost || 0)))}
                                      className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                    >
                                      {format(Number(product.cost || 0))}
                                    </div>
                                  )
                                ) : (
                                  <div className="px-2 py-1">{format(Number(product.cost || 0))}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                {calculateMargin(product.price, product.cost || 0)}
                              </TableCell>
                              <TableCell>
                                {hasPermission("canManageProducts") ? (
                                  editingItem && editingItem.id === product.id && editingItem.field === 'stockQuantity' ? (
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="number"
                                        value={editingItem.value}
                                        onChange={handleEditChange}
                                        className="h-8 w-24"
                                        min="0"
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => saveEdit(product.id)}
                                        className="h-8 w-8 p-0"
                                        title="Save"
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEditing}
                                        className="h-8 w-8 p-0"
                                        title="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => startEditing(product.id, 'stockQuantity', product.stockQuantity)}
                                      className={`cursor-pointer hover:bg-muted px-2 py-1 rounded ${
                                        product.stockQuantity <= 5 ? 'text-red-500 font-medium' : ''
                                      }`}
                                    >
                                      {product.stockQuantity}
                                    </div>
                                  )
                                ) : (
                                  <div className={`px-2 py-1 ${product.stockQuantity <= 5 ? 'text-red-500 font-medium' : ''}`}>
                                    {product.stockQuantity}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {hasPermission("canManageProducts") ? (
                                  editingItem && editingItem.id === product.id && editingItem.field === 'soldBy' ? (
                                    <div className="flex items-center space-x-2">
                                      <Select
                                        value={editingItem.value as string}
                                        onValueChange={(value) => setEditingItem({ ...editingItem, value })}
                                      >
                                        <SelectTrigger className="h-8 w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="each">Each</SelectItem>
                                          <SelectItem value="weight">Weight</SelectItem>
                                          <SelectItem value="volume">Volume</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => saveEdit(product.id)}
                                        className="h-8 w-8 p-0"
                                        title="Save"
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEditing}
                                        className="h-8 w-8 p-0"
                                        title="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => startEditing(product.id, 'soldBy', product.soldBy || 'each')}
                                      className="cursor-pointer hover:bg-muted px-2 py-1 rounded capitalize"
                                    >
                                      {product.soldBy || 'each'}
                                    </div>
                                  )
                                ) : (
                                  <div className="px-2 py-1 capitalize">
                                    {product.soldBy || 'each'}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={product.isTaxable !== false} // Handle undefined by defaulting to true
                                    onCheckedChange={(checked) =>
                                      updateProductMutation.mutate({
                                        id: product.id,
                                        updates: { isTaxable: checked }
                                      })
                                    }
                                    disabled={!hasPermission("canManageProducts")}
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <PermissionGuard requiredPermission="canManageProducts">
                                        <DropdownMenuItem onClick={() => openProductDetailDialog(product)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          <span>Edit Details</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openVariantsDialog(product)}>
                                          <Layers className="mr-2 h-4 w-4" />
                                          <span>Manage Variants</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openStoresDialog(product)}>
                                          <Store className="mr-2 h-4 w-4" />
                                          <span>Store Availability</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openModifiersDialog(product)}>
                                          <ListPlus className="mr-2 h-4 w-4" />
                                          <span>Manage Modifiers</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openAllergensDialog(product)}>
                                          <AlertTriangle className="mr-2 h-4 w-4" />
                                          <span>Food Allergens</span>
                                        </DropdownMenuItem>
                                      </PermissionGuard>
                                      {!hasPermission("canManageProducts") && (
                                        <DropdownMenuItem disabled>
                                          <ShieldAlert className="mr-2 h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">Requires Product Management Permission</span>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <PermissionGuard requiredPermission="canManageProducts">
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => openDeleteConfirmDialog(product)}
                                        >
                                          <Trash className="mr-2 h-4 w-4" />
                                          <span>Delete</span>
                                        </DropdownMenuItem>
                                      </PermissionGuard>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first page, last page, current page, and pages around current page
                            return page === 1 || page === totalPages ||
                                   Math.abs(page - currentPage) <= 1;
                          })
                          .reduce((acc: (number | string)[], page, index, array) => {
                            if (index > 0 && page - array[index - 1] > 1) {
                              acc.push('...');
                            }
                            acc.push(page);
                            return acc;
                          }, [])
                          .map((page, index) => (
                            typeof page === 'number' ? (
                              <PaginationItem key={index}>
                                <PaginationLink
                                  isActive={currentPage === page}
                                  onClick={() => paginate(page)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ) : (
                              <PaginationItem key={index}>
                                <span className="px-2">...</span>
                              </PaginationItem>
                            )
                          ))
                        }

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </PermissionGuard>
          </TabsContent>

          <TabsContent value="categories">
            <PermissionGuard requiredPermission="canManageCategories">
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
              ) : categoriesError ? (
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
            </PermissionGuard>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs - wrap each with permission guards */}
      <PermissionGuard requiredPermission="canManageProducts">
        {/* Add Product Dialog */}
        <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddProduct}>
              <Tabs defaultValue="basics" className="mt-2">
                <TabsList className="grid grid-cols-5 mb-4">
                  <TabsTrigger value="basics">Basics</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="stores">Availability</TabsTrigger>
                  <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
                  <TabsTrigger value="allergens">Allergens</TabsTrigger>
                </TabsList>

                <TabsContent value="basics">
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
                          type="text"
                          value={format(Number(newProduct.price))}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setNewProduct(prev => ({
                              ...prev,
                              price: parse(value)
                            }));
                          }}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={newProduct.description ?? ""}
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
                          value={newProduct.sku ?? ""}
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
                          value={newProduct.imageUrl ?? ""}
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

                    <div className="flex items-center gap-8">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="inStock"
                          checked={newProduct.inStock}
                          onCheckedChange={handleStockStatusChange}
                        />
                        <Label htmlFor="inStock">In Stock</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isTaxable"
                          checked={newProduct.isTaxable !== false}
                          onCheckedChange={(checked) =>
                            setNewProduct(prev => ({ ...prev, isTaxable: checked }))
                          }
                        />
                        <Label htmlFor="isTaxable">Taxable</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variants">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Add Variant</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="optionName">Option Name</Label>
                          <Input
                            id="optionName"
                            name="optionName"
                            value={newVariant.optionName}
                            onChange={handleVariantChange}
                            placeholder="e.g. Size, Color, Material"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="optionValue">Option Value</Label>
                          <Input
                            id="optionValue"
                            name="optionValue"
                            value={newVariant.optionValue}
                            onChange={handleVariantChange}
                            placeholder="e.g. Large, Red, Cotton"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          if (!newVariant.optionName || !newVariant.optionValue) {
                            toast({
                              title: "Validation Error",
                              description: "Option name and value are required",
                              variant: "destructive"
                            });
                            return;
                          }

                          // Add to temporary list of variants to be created after product
                          setProductVariants([...productVariants, {
                            id: Date.now(), // Temporary ID
                            optionName: newVariant.optionName,
                            optionValue: newVariant.optionValue
                          }]);

                          // Reset the form
                          setNewVariant({
                            optionName: "",
                            optionValue: "",
                            price: "",
                            cost: "",
                            sku: "",
                            barcode: "",
                            stockQuantity: 0
                          });
                        }}
                        className="mt-4"
                      >
                        Add Variant
                      </Button>
                    </div>

                    <div className="border rounded-md">
                      <h3 className="font-medium p-4 border-b">Pending Variants</h3>
                      {productVariants.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No variants added yet. Variants will be created after saving the product.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Option Name</TableHead>
                              <TableHead>Option Value</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productVariants.map((variant) => (
                              <TableRow key={variant.id}>
                                <TableCell>
                                  <span className="font-medium">{variant.optionName}</span>
                                </TableCell>
                                <TableCell>{variant.optionValue}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600"
                                    onClick={() => {
                                      setProductVariants(productVariants.filter(v => v.id !== variant.id));
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stores">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Store</TableHead>
                            <TableHead>Available</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stores && stores.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                No stores configured.
                              </TableCell>
                            </TableRow>
                          ) : !stores ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                Loading stores...
                              </TableCell>
                            </TableRow>
                          ) : (
                            stores.map((store: StoreSettings) => {
                              // Check if we already have a setting for this store
                              const storeIndex = productStores.findIndex(s => s.storeId === store.id);
                              const isAvailable = storeIndex >= 0 ? productStores[storeIndex].isAvailable : true;

                              return (
                                <TableRow key={store.id}>
                                  <TableCell>
                                    {store.name} {store.branch ? `- ${store.branch}` : ''}
                                  </TableCell>
                                  <TableCell>
                                    <Switch
                                      checked={isAvailable}
                                      onCheckedChange={(checked) => {
                                        if (storeIndex >= 0) {
                                          const newStores = [...productStores];
                                          newStores[storeIndex].isAvailable = checked;
                                          setProductStores(newStores);
                                        } else {
                                          setProductStores([
                                            ...productStores,
                                            { storeId: store.id, isAvailable: checked }
                                          ]);
                                        }
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Store availability settings will be applied after creating the product.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="modifiers">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Available Modifiers</h3>

                      {isLoadingModifiers ? (
                        <div className="text-center py-4">Loading modifiers...</div>
                      ) : !availableModifiers || availableModifiers.length === 0 ? (
                        <div className="text-center py-4">
                          No modifiers available. Create modifiers first.
                          <div className="mt-2">
                            <Button variant="link" asChild>
                              <a href="/items-modifiers">Create Modifiers</a>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {availableModifiers.map(modifier => {
                            // Check if this modifier is already selected
                            const isSelected = productModifiers.some(pm => pm.modifierId === modifier.id);

                            return (
                              <div key={modifier.id} className="flex items-center justify-between p-2 border rounded">
                                <span>{modifier.name}</span>
                                <Button
                                  variant={isSelected ? "destructive" : "default"}
                                  size="sm"
                                  onClick={() => {
                                    if (isSelected) {
                                      // Remove the modifier
                                      setProductModifiers(prev =>
                                        prev.filter(pm => pm.modifierId !== modifier.id)
                                      );
                                    } else {
                                      // Add the modifier
                                      setProductModifiers(prev => [
                                        ...prev,
                                        {
                                          id: Date.now(), // Temporary ID
                                          modifierId: modifier.id,
                                          name: modifier.name
                                        }
                                      ]);
                                    }
                                  }}
                                >
                                  {isSelected ? "Remove" : "Add"}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border rounded-md">
                      <h3 className="font-medium p-4 border-b">Selected Modifiers</h3>
                      {productModifiers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No modifiers selected. Modifiers will be linked after saving the product.
                        </div>
                      ) : (
                        <ul className="divide-y max-h-60 overflow-y-auto">
                          {productModifiers.map(modifier => (
                            <li key={modifier.id} className="flex items-center justify-between p-4">
                              <span className="font-medium">
                                {modifier.name || `Modifier #${modifier.modifierId}`}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => {
                                  setProductModifiers(prev =>
                                    prev.filter(m => m.id !== modifier.id)
                                  );
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="allergens">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Add Allergen</h3>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label htmlFor="allergenSelect" className="mb-2">Select Allergen</Label>
                          <Select
                            value={selectedAllergenId?.toString() || ""}
                            onValueChange={handleAllergenSelect}
                          >
                            <SelectTrigger id="allergenSelect">
                              <SelectValue placeholder="Select an allergen" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingAllergens ? (
                                <SelectItem value="loading" disabled>Loading allergens...</SelectItem>
                              ) : !allergensList || allergensList.length === 0 ? (
                                <SelectItem value="none" disabled>No allergens found</SelectItem>
                              ) : (
                                allergensList.map((allergen: { id: number; name: string; severity?: string }) => (
                                  <SelectItem
                                    key={allergen.id}
                                    value={allergen.id.toString()}
                                  >
                                    {allergen.name}
                                    {allergen.severity && (
                                      <span className={`ml-2 text-xs ${
                                        allergen.severity === 'severe' ? 'text-destructive' :
                                        allergen.severity === 'moderate' ? 'text-amber-500' :
                                        'text-green-500'
                                      }`}>
                                        ({allergen.severity})
                                      </span>
                                    )}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <Label htmlFor="allergenseverity" className="mb-2">Severity</Label>
                          <Select
                            value={selectedSeverity}
                            onValueChange={(value) => setSelectedSeverity(value as "mild" | "moderate" | "severe")}
                          >
                            <SelectTrigger id="allergenseverity">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mild">Mild</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="severe">Severe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddSelectedAllergen}
                          className="mb-[1px]"
                          disabled={!selectedAllergenId}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-md">
                      <h3 className="font-medium p-4 border-b">Selected Allergens</h3>
                      {productAllergens.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No allergens added. Allergens will be linked after saving the product.
                        </div>
                      ) : (
                        <ul className="divide-y max-h-60 overflow-y-auto">
                          {productAllergens.map((allergen, index) => (
                            <li key={index} className="flex items-center justify-between p-4">
                              <div>
                                <span className="font-medium">{allergen.name}</span>
                                <Badge variant={
                                  allergen.severity === 'mild'
                                    ? "outline"
                                    : allergen.severity === 'moderate'
                                      ? "secondary"
                                      : "destructive"
                                } className="ml-2">
                                  {allergen.severity}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => handleRemoveAllergen(index)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddProductDialogOpen(false);
                  resetProductForm();
                  setProductVariants([]);
                  setProductStores([]);
                  setProductModifiers([]);
                  setProductAllergens([]);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addProductMutation.isPending}>
                  {addProductMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Product Detail Dialog */}
        <Dialog open={isProductDetailDialogOpen} onOpenChange={setIsProductDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Item Details</DialogTitle>
            </DialogHeader>
            <form onSubmit={updateProduct}>
              <Tabs defaultValue="basics" className="mt-2">
                <TabsList className="grid grid-cols-5 mb-4">
                  <TabsTrigger value="basics">Basics</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="stores">Availability</TabsTrigger>
                  <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
                  <TabsTrigger value="allergens">Allergens</TabsTrigger>
                </TabsList>

                <TabsContent value="basics">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Name*</Label>
                        <Input
                          id="edit-name"
                          name="name"
                          value={newProduct.name}
                          onChange={handleProductChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-price">Price*</Label>
                        <Input
                          id="edit-price"
                          name="price"
                          type="text"
                          value={format(Number(newProduct.price))}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setNewProduct(prev => ({
                              ...prev,
                              price: value
                            }));
                          }}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-cost">Cost</Label>
                        <Input
                          id="edit-cost"
                          name="cost"
                          type="text"
                          value={format(Number(newProduct.cost || 0))}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setNewProduct(prev => ({
                              ...prev,
                              cost: value
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-barcode">Barcode</Label>
                        <Input
                          id="edit-barcode"
                          name="barcode"
                          value={newProduct.barcode || ""}
                          onChange={handleProductChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        name="description"
                        value={newProduct.description || ""}
                        onChange={handleProductChange}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-categoryId">Category</Label>
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
                        <Label htmlFor="edit-sku">SKU</Label>
                        <Input
                          id="edit-sku"
                          name="sku"
                          value={newProduct.sku || ""}
                          onChange={handleProductChange}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-imageUrl">Image URL</Label>
                        <Input
                          id="edit-imageUrl"
                          name="imageUrl"
                          value={newProduct.imageUrl || ""}
                          onChange={handleProductChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-stockQuantity">Stock Quantity</Label>
                        <Input
                          id="edit-stockQuantity"
                          name="stockQuantity"
                          type="number"
                          value={newProduct.stockQuantity}
                          onChange={handleProductChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-soldBy">Sold By</Label>
                        <Select
                          name="soldBy"
                          value={newProduct.soldBy || "each"}
                          onValueChange={(value) => setNewProduct(prev => ({ ...prev, soldBy: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sold by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="each">Each</SelectItem>
                            <SelectItem value="weight">Weight</SelectItem>
                            <SelectItem value="volume">Volume</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-inStock"
                          checked={newProduct.inStock}
                          onCheckedChange={(checked) =>
                            setNewProduct(prev => ({ ...prev, inStock: checked }))
                          }
                        />
                        <Label htmlFor="edit-inStock">In Stock</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-isTaxable"
                          checked={newProduct.isTaxable !== false}
                          onCheckedChange={(checked) =>
                            setNewProduct(prev => ({ ...prev, isTaxable: checked }))
                          }
                        />
                        <Label htmlFor="edit-isTaxable">Taxable</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variants">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Add New Variant</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-optionName">Option Name</Label>
                          <Input
                            id="edit-optionName"
                            name="optionName"
                            value={newVariant.optionName}
                            onChange={handleVariantChange}
                            placeholder="e.g. Size, Color, Material"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-optionValue">Option Value</Label>
                          <Input
                            id="edit-optionValue"
                            name="optionValue"
                            value={newVariant.optionValue}
                            onChange={handleVariantChange}
                            placeholder="e.g. Large, Red, Cotton"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleAddVariant}
                        className="mt-4"
                      >
                        Add Variant
                      </Button>
                    </div>

                    <div className="border rounded-md">
                      <h3 className="font-medium p-4 border-b">Existing Variants</h3>
                      <div className="max-h-96 overflow-y-auto">
                        {productVariants.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No variants added yet.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Option Name</TableHead>
                                <TableHead>Option Value</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {productVariants.map((variant) => (
                                <TableRow key={variant.id}>
                                  <TableCell>
                                    <span className="font-medium">{variant.optionName}</span>
                                  </TableCell>
                                  <TableCell>{variant.optionValue}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600"
                                      onClick={() => handleDeleteVariant(variant.id)}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stores">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Store</TableHead>
                            <TableHead>Available</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stores && stores.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                No stores configured.
                              </TableCell>
                            </TableRow>
                          ) : !stores ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                Loading stores...
                              </TableCell>
                            </TableRow>
                          ) : (
                            stores.map((store: StoreSettings) => {
                              const storeLink = productStores.find(ps => ps.storeId === store.id);
                              const isAvailable = storeLink ? storeLink.isAvailable : true;

                              return (
                                <TableRow key={store.id}>
                                  <TableCell>
                                    {store.name} {store.branch ? `- ${store.branch}` : ''}
                                  </TableCell>
                                  <TableCell>
                                    <Switch
                                      checked={isAvailable}
                                      onCheckedChange={() => handleToggleStoreAvailability(store.id, isAvailable)}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="modifiers">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Available Modifiers</h3>

                      {isLoadingModifiers ? (
                        <div className="text-center py-4">Loading modifiers...</div>
                      ) : !availableModifiers || availableModifiers.length === 0 ? (
                        <div className="text-center py-4">
                          No modifiers available. Create modifiers first.
                          <div className="mt-2">
                            <Button variant="link" asChild>
                              <a href="/items-modifiers">Create Modifiers</a>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {availableModifiers.map(modifier => {
                            // Check if this modifier is already selected
                            const isSelected = productModifiers.some(pm => pm.modifierId === modifier.id);

                            return (
                              <div key={modifier.id} className="flex items-center justify-between p-2 border rounded">
                                <span>{modifier.name}</span>
                                <Button
                                  variant={isSelected ? "destructive" : "default"}
                                  size="sm"
                                  onClick={() => {
                                    if (isSelected) {
                                      // Remove the modifier
                                      setProductModifiers(prev =>
                                        prev.filter(pm => pm.modifierId !== modifier.id)
                                      );
                                    } else {
                                      // Add the modifier
                                      setProductModifiers(prev => [
                                        ...prev,
                                        {
                                          id: Date.now(), // Temporary ID
                                          modifierId: modifier.id,
                                          name: modifier.name
                                        }
                                      ]);
                                    }
                                  }}
                                >
                                  {isSelected ? "Remove" : "Add"}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border rounded-md">
                      <h3 className="font-medium p-4 border-b">Selected Modifiers</h3>
                      {productModifiers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No modifiers selected. Modifiers will be linked after saving the product.
                        </div>
                      ) : (
                        <ul className="divide-y max-h-60 overflow-y-auto">
                          {productModifiers.map(modifier => (
                            <li key={modifier.id} className="flex items-center justify-between p-4">
                              <span className="font-medium">
                                {modifier.name || `Modifier #${modifier.modifierId}`}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => {
                                  setProductModifiers(prev =>
                                    prev.filter(m => m.id !== modifier.id)
                                  );
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="allergens">
                  <div className="grid gap-4 py-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Add Allergen</h3>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label htmlFor="edit-allergenSelect" className="mb-2">Select Allergen</Label>
                          <Select
                            value={selectedAllergenId?.toString() || ""}
                            onValueChange={handleAllergenSelect}
                          >
                            <SelectTrigger id="edit-allergenSelect">
                              <SelectValue placeholder="Select an allergen" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingAllergens ? (
                                <SelectItem value="loading" disabled>Loading allergens...</SelectItem>
                              ) : !allergensList || allergensList.length === 0 ? (
                                <SelectItem value="none" disabled>No allergens found</SelectItem>
                              ) : (
                                allergensList.map((allergen: { id: number; name: string; severity?: string }) => (
                                  <SelectItem
                                    key={allergen.id}
                                    value={allergen.id.toString()}
                                  >
                                    {allergen.name}
                                    {allergen.severity && (
                                      <span className={`ml-2 text-xs ${
                                        allergen.severity === 'severe' ? 'text-destructive' :
                                        allergen.severity === 'moderate' ? 'text-amber-500' :
                                        'text-green-500'
                                      }`}>
                                        ({allergen.severity})
                                      </span>
                                    )}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <Label htmlFor="edit-allergenseverity" className="mb-2">Severity</Label>
                          <Select
                            value={selectedSeverity}
                            onValueChange={(value) => setSelectedSeverity(value as "mild" | "moderate" | "severe")}
                          >
                            <SelectTrigger id="edit-allergenseverity">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mild">Mild</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="severe">Severe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddSelectedAllergen}
                          className="mb-[1px]"
                          disabled={!selectedAllergenId}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="link"
                          className="text-xs"
                          asChild
                        >
                          <a href="/items/allergens" target="_blank">Manage Master Allergen List</a>
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-md">
                      <h3 className="font-medium p-4 border-b">Current Allergens</h3>
                      {productAllergens.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No allergens added to this product.
                        </div>
                      ) : (
                        <ul className="divide-y max-h-60 overflow-y-auto">
                          {productAllergens.map((allergen, index) => (
                            <li key={index} className="flex items-center justify-between p-4">
                              <div>
                                <span className="font-medium">{allergen.name}</span>
                                <Badge variant={
                                  allergen.severity === 'mild'
                                    ? "outline"
                                    : allergen.severity === 'moderate'
                                      ? "secondary"
                                      : "destructive"
                                } className="ml-2">
                                  {allergen.severity}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => handleRemoveAllergen(index)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setIsProductDetailDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProductMutation.isPending}>
                  {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Variants Management Dialog */}
        <Dialog open={isVariantsDialogOpen} onOpenChange={setIsVariantsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Variants for {selectedProduct?.name}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">Add New Variant</h3>
                <form onSubmit={handleAddVariant} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="optionName">Option Name*</Label>
                      <Input
                        id="optionName"
                        name="optionName"
                        value={newVariant.optionName}
                        onChange={handleVariantChange}
                        placeholder="e.g. Size, Color, Material"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="optionValue">Option Value*</Label>
                      <Input
                        id="optionValue"
                        name="optionValue"
                        value={newVariant.optionValue}
                        onChange={handleVariantChange}
                        placeholder="e.g. Large, Red, Cotton"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={addVariantMutation.isPending}>
                    {addVariantMutation.isPending ? "Adding..." : "Add Variant"}
                  </Button>
                </form>
              </div>

              <div className="border rounded-md">
                <h3 className="font-medium p-4 border-b">Existing Variants</h3>
                <div className="max-h-96 overflow-y-auto">
                  {productVariants.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No variants added yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Option Name</TableHead>
                          <TableHead>Option Value</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productVariants.map((variant) => (
                          <TableRow key={variant.id}>
                            <TableCell>
                              <span className="font-medium">{variant.optionName}</span>
                            </TableCell>
                            <TableCell>{variant.optionValue}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => handleDeleteVariant(variant.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setIsVariantsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Store Availability Dialog */}
        <Dialog open={isStoresDialogOpen} onOpenChange={setIsStoresDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Store Availability for {selectedProduct?.name}</DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores && stores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4">
                          No stores configured.
                        </TableCell>
                      </TableRow>
                    ) : !stores ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4">
                          Loading stores...
                        </TableCell>
                      </TableRow>
                    ) : (
                      stores.map((store: StoreSettings) => {
                        const storeLink = productStores.find(ps => ps.storeId === store.id);
                        const isAvailable = storeLink ? storeLink.isAvailable : true;

                        return (
                          <TableRow key={store.id}>
                            <TableCell>
                              {store.name} {store.branch ? `- ${store.branch}` : ''}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={isAvailable}
                                onCheckedChange={() => handleToggleStoreAvailability(store.id, isAvailable)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setIsStoresDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modifiers Management Dialog */}
        <Dialog open={isModifiersDialogOpen} onOpenChange={setIsModifiersDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Manage Modifiers for {selectedProduct?.name}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">Available Modifiers</h3>

                {isLoadingModifiers ? (
                  <div className="text-center py-4">Loading modifiers...</div>
                ) : !availableModifiers || availableModifiers.length === 0 ? (
                  <div className="text-center py-4">
                    No modifiers available. Create modifiers first.
                    <div className="mt-2">
                      <Button variant="link" asChild>
                        <a href="/items/modifiers">Create Modifiers</a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {availableModifiers.map(modifier => {
                      // Check if this modifier is already selected
                      const isSelected = productModifiers.some(pm => pm.modifierId === modifier.id);

                      return (
                        <div key={modifier.id} className="flex items-center justify-between p-2 border rounded">
                          <span>{modifier.name}</span>
                          <Button
                            variant={isSelected ? "destructive" : "default"}
                            size="sm"
                            onClick={() => {
                              if (isSelected) {
                                setProductModifiers(productModifiers.filter(
                                  pm => pm.modifierId !== modifier.id
                                ));
                              } else {
                                setProductModifiers([
                                  ...productModifiers,
                                  { id: Date.now(), modifierId: modifier.id, productId: 0 }
                                ]);
                              }
                            }}
                          >
                            {isSelected ? "Remove" : "Add"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border rounded-md">
                <h3 className="font-medium p-4 border-b">Selected Modifiers</h3>
                {productModifiers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No modifiers selected. Modifiers will be linked after saving the product.
                  </div>
                ) : (
                  <ul className="divide-y max-h-60 overflow-y-auto">
                    {productModifiers.map(modifier => {
                      const modifierDetails = availableModifiers.find(m => m.id === modifier.modifierId);

                      return (
                        <li key={modifier.id} className="flex items-center justify-between p-4">
                          <span className="font-medium">
                            {modifierDetails?.name || `Modifier #${modifier.modifierId}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600"
                            onClick={() => {
                              setProductModifiers(productModifiers.filter(m => m.id !== modifier.id));
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setIsModifiersDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="mb-2">Are you sure you want to delete this item?</p>
              <p className="font-medium">{selectedProduct?.name}</p>
              <p className="text-destructive text-sm mt-2">This action cannot be undone.</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteProduct}
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? "Deleting..." : "Delete Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Food Allergens Dialog */}
        <Dialog open={isAllergensDialogOpen} onOpenChange={setIsAllergensDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Food Allergens for {selectedProduct?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage allergy information to help customers with dietary restrictions.
              </p>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">Add Allergen</h3>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="edit-allergenSelect" className="mb-2">Select Allergen*</Label>
                    <Select
                      value={selectedAllergenId?.toString() || ""}
                      onValueChange={handleAllergenSelect}
                    >
                      <SelectTrigger id="edit-allergenSelect">
                        <SelectValue placeholder="Select an allergen" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingAllergens ? (
                          <SelectItem value="loading" disabled>Loading allergens...</SelectItem>
                        ) : !allergensList || allergensList.length === 0 ? (
                          <SelectItem value="none" disabled>No allergens found</SelectItem>
                        ) : (
                          allergensList.map((allergen: { id: number; name: string; severity?: string }) => (
                            <SelectItem
                              key={allergen.id}
                              value={allergen.id.toString()}
                            >
                              {allergen.name}
                              {allergen.severity && (
                                <span className={`ml-2 text-xs ${
                                  allergen.severity === 'severe' ? 'text-destructive' :
                                  allergen.severity === 'moderate' ? 'text-amber-500' :
                                  'text-green-500'
                                }`}>
                                  ({allergen.severity})
                                </span>
                              )}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label htmlFor="edit-allergenseverity" className="mb-2">Severity</Label>
                    <Select
                      value={selectedSeverity}
                      onValueChange={(value) => setSelectedSeverity(value as "mild" | "moderate" | "severe")}
                    >
                      <SelectTrigger id="edit-allergenseverity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddSelectedAllergen}
                    className="mb-[1px]"
                    disabled={!selectedAllergenId}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="link"
                    className="text-xs"
                    asChild
                  >
                    <a href="/items/allergens" target="_blank">Manage Master Allergen List</a>
                  </Button>
                </div>
              </div>

              <div className="border rounded-md">
                <h3 className="font-medium p-4 border-b">Current Allergens</h3>
                {productAllergens.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No allergens added to this product.
                  </div>
                ) : (
                  <ul className="divide-y max-h-60 overflow-y-auto">
                    {productAllergens.map((allergen, index) => (
                      <li key={index} className="flex items-center justify-between p-4">
                        <div>
                          <span className="font-medium">{allergen.name}</span>
                          <Badge variant={
                            allergen.severity === 'mild'
                              ? "outline"
                              : allergen.severity === 'moderate'
                                ? "secondary"
                                : "destructive"
                          } className="ml-2">
                            {allergen.severity}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => handleRemoveAllergen(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAllergensDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveAllergens}
                disabled={updateAllergensMutation.isPending}
              >
                {updateAllergensMutation.isPending ? "Saving..." : "Save Allergens"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>

      {/* Add Category Dialog - separate permission */}
      <PermissionGuard requiredPermission="canManageCategories">
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
      </PermissionGuard>
    </div>
  );
}
