import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product, Category } from "@shared/schema";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/hooks/use-currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { AlertTriangle, Check, Grid, List } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { format } = useCurrency();
  const [showAllergens, setShowAllergens] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState("");

  // Helper function to get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "severe": return "bg-red-100 text-red-800 border-red-200";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "mild": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Handle quantity change with validation
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);

    // Basic validation for numeric input
    if (isNaN(newValue)) {
      setQuantity(1);
      setQuantityError("");
      return;
    }

    // Validate against available stock
    if (product.stockQuantity !== undefined && newValue > product.stockQuantity) {
      setQuantityError(`Only ${product.stockQuantity} available`);
    } else if (newValue <= 0) {
      setQuantityError("Quantity must be at least 1");
    } else {
      setQuantityError("");
    }

    setQuantity(newValue);
  };

  // Handle add to cart with quantity
  const handleAddToCart = () => {
    if (quantityError) return;

    // If quantity is valid, call the parent handler with the product and quantity
    onAddToCart(product, quantity);

    // Reset quantity after adding to cart
    setQuantity(1);
    setShowQuantity(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Fixed aspect ratio container with consistent height */}
        <div className="relative w-full pb-[100%]">
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-gray-400">No image</span>
              </div>
            )}
            {/* Out of stock overlay */}
            {!product.inStock && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white font-medium px-3 py-1 bg-red-500 rounded-full text-sm">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Allergen warning icon */}
            {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
              <Popover open={showAllergens} onOpenChange={setShowAllergens}>
                <PopoverTrigger asChild>
                  <button
                    className="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded-full hover:bg-yellow-600 transition-colors"
                    title="View allergens"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-white" align="end">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
                      Allergen Information
                    </h4>
                    <div className="max-h-[200px] overflow-y-auto">
                      {product.allergens.map((allergen: { name: string; severity?: string }, index: number) => (
                        <div
                          key={index}
                          className={`text-xs px-2 py-1 mb-1 rounded-md border ${getSeverityColor(allergen.severity || 'moderate')}`}
                        >
                          <span className="font-medium">{allergen.name}</span>
                          {allergen.severity && (
                            <span className="ml-1 text-xs opacity-75">
                              ({allergen.severity})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Product details section with fixed height */}
        <div className="mt-4 min-h-[120px] flex flex-col">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{product.name}</h3>

          {/* Product description */}
          {typeof product.description === 'string' && product.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
              {product.description}
            </p>
          )}

          {/* Allergen badges - now we'll just show a few */}
          {/* {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 items-center">
              {product.allergens.slice(0, 2).map((allergen: { name: string; severity?: string }, index: number) => (
                <span
                  key={index}
                  className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(allergen.severity || 'moderate')}`}
                >
                  {allergen.name}
                </span>
              ))}
              {product.allergens.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{product.allergens.length - 2} more
                </span>
              )}
            </div>
          )} */}

          {/* Additional info badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {product.isTaxable && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                Taxable
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {product.soldBy === 'weight' ? 'Sold by weight' : 'Sold by unit'}
            </span>
            {product.stockQuantity > 0 && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                In stock: {product.stockQuantity}
              </span>
            )}
          </div>

          {/* Price and add to cart section - always at the bottom */}
          <div className="mt-auto flex justify-between items-center">
            <p className="font-bold text-primary">{format(Number(product.price))}</p>
            <Popover open={showQuantity && product.inStock} onOpenChange={(open) => product.inStock && setShowQuantity(open)}>
              <PopoverTrigger asChild>
                <button
                  className={`text-gray-500 hover:text-primary ${!product.inStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!product.inStock}
                  title={product.inStock ? 'Add to cart' : 'Out of stock'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="top" align="center">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Add to Cart</h4>
                    <span className="text-sm text-gray-500">
                      {product.stockQuantity !== undefined ? `${product.stockQuantity} available` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="quantity" className="text-sm font-medium">Quantity:</label>
                    <div className="flex-1">
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={product.stockQuantity}
                        value={quantity}
                        onChange={handleQuantityChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                  {quantityError && <p className="text-xs text-red-500">{quantityError}</p>}
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowQuantity(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!!quantityError || quantity < 1}
                      onClick={handleAddToCart}
                      className="bg-primary text-white"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductListItem({ product, onAddToCart, getSeverityColor, format }: {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  getSeverityColor: (severity: string) => string;
  format: (value: number | string | null | undefined) => string;
}) {
  const [showListAllergens, setShowListAllergens] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState("");

  // Handle quantity change with validation
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);

    // Basic validation for numeric input
    if (isNaN(newValue)) {
      setQuantity(1);
      setQuantityError("");
      return;
    }

    // Validate against available stock
    if (product.stockQuantity !== undefined && newValue > product.stockQuantity) {
      setQuantityError(`Only ${product.stockQuantity} available`);
    } else if (newValue <= 0) {
      setQuantityError("Quantity must be at least 1");
    } else {
      setQuantityError("");
    }

    setQuantity(newValue);
  };

  // Handle add to cart with quantity
  const handleAddToCart = () => {
    if (quantityError) return;

    // If quantity is valid, call the parent handler with the product and quantity
    onAddToCart(product, quantity);

    // Reset quantity after adding to cart
    setQuantity(1);
    setShowQuantity(false);
  };

  return (
    <div className="flex bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3">
      {/* Product image */}
      <div className="w-20 h-20 relative flex-shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover rounded-md"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
            <span className="text-white font-medium px-2 py-0.5 bg-red-500 rounded-full text-xs">
              Out of Stock
            </span>
          </div>
        )}

        {/* Allergen warning icon for list view */}
        {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
          <Popover open={showListAllergens} onOpenChange={setShowListAllergens}>
            <PopoverTrigger asChild>
              <button
                className="absolute top-0 right-0 bg-yellow-500 text-white p-1 rounded-full hover:bg-yellow-600 transition-colors"
                title="View allergens"
              >
                <AlertTriangle className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-white" align="end">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
                  Allergen Information
                </h4>
                <div className="max-h-[200px] overflow-y-auto">
                  {product.allergens.map((allergen: { name: string; severity?: string }, index: number) => (
                    <div
                      key={index}
                      className={`text-xs px-2 py-1 mb-1 rounded-md border ${getSeverityColor(allergen.severity || 'moderate')}`}
                    >
                      <span className="font-medium">{allergen.name}</span>
                      {allergen.severity && (
                        <span className="ml-1 text-xs opacity-75">
                          ({allergen.severity})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Product details */}
      <div className="ml-4 flex-1 flex flex-col min-w-0">
        <div className="flex items-center">
          <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
          {/* Allergen indicator beside product name */}
          {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
            <span
              className="ml-2 text-yellow-500 cursor-help"
              title="Contains allergens"
              onClick={() => setShowListAllergens(true)}
            >
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
        </div>

        {typeof product.description === 'string' && product.description && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-1">
            {product.description}
          </p>
        )}

        {/* Allergens inline */}
        {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {product.allergens.slice(0, 3).map((allergen: { name: string; severity?: string }, index: number) => (
              <span
                key={index}
                className="text-xs px-1 py-0 rounded-sm border bg-yellow-50 text-yellow-800 border-yellow-200"
              >
                {allergen.name}
              </span>
            ))}
            {product.allergens.length > 3 && (
              <span className="text-xs text-gray-500">+{product.allergens.length - 3} more</span>
            )}
          </div>
        )}

        {/* Stock indicator */}
        {product.stockQuantity > 0 && (
          <div className="text-xs text-green-600 mb-1">
            In stock: {product.stockQuantity}
          </div>
        )}

        {/* Price and add button on same line */}
        <div className="mt-auto flex items-center justify-between">
          <p className="font-bold text-primary">{format(Number(product.price))}</p>

          <Popover open={showQuantity && product.inStock} onOpenChange={(open) => product.inStock && setShowQuantity(open)}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                disabled={!product.inStock}
                className={!product.inStock ? "opacity-50 cursor-not-allowed" : ""}
              >
                Add to Cart
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="top" align="end">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{product.name}</h4>
                  <span className="text-sm text-gray-500">
                    {product.stockQuantity !== undefined ? `${product.stockQuantity} available` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="listQuantity" className="text-sm font-medium">Quantity:</label>
                  <div className="flex-1">
                    <Input
                      id="listQuantity"
                      type="number"
                      min="1"
                      max={product.stockQuantity}
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="w-full"
                    />
                  </div>
                </div>
                {quantityError && <p className="text-xs text-red-500">{quantityError}</p>}
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowQuantity(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!!quantityError || quantity < 1}
                    onClick={handleAddToCart}
                    className="bg-primary text-white"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

function ProductsLoading() {
  return (
    <>
      {[...Array(6)].map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Skeleton className="h-36 w-full" />
          <div className="p-3">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default function ProductSection() {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { format } = useCurrency();  // Move the hook call here to the component level

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter state
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [showTaxableOnly, setShowTaxableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "price" | "newest">("name");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Fetch products
  const {
    data: products,
    isLoading: isLoadingProducts,
    isError: isProductsError
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      return response.json();
    }
  });

  // Fetch categories
  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isCategoriesError
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories");
      return response.json();
    }
  });

  // Handle add to cart
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    if (!product.inStock) {
      toast({
        title: "Cannot add to cart",
        description: "This product is out of stock",
        variant: "destructive"
      });
      return;
    }

    // Validate quantity against stock
    if (product.stockQuantity !== undefined && quantity > product.stockQuantity) {
      toast({
        title: "Invalid quantity",
        description: `Only ${product.stockQuantity} units available in stock`,
        variant: "destructive"
      });
      return;
    }

    // Add to cart with specified quantity
    addToCart(product, quantity);

    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name} added to your cart`,
    });
  };

  // Filter and sort products based on search, category, and filter options
  const filteredProducts = products?.filter((product: Product) => {
    // Search filter
    const matchesSearch = searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;

    // Stock filter
    const matchesStockFilter = !showInStockOnly || product.inStock;

    // Taxable filter
    const matchesTaxableFilter = !showTaxableOnly || product.isTaxable;

    return matchesSearch && matchesCategory && matchesStockFilter && matchesTaxableFilter;
  }) ?? [];

  // Sort filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return Number(a.price) - Number(b.price);
      case "newest":
        return (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
               (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Toggle filter dropdown
  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === "grid" ? "list" : "grid");
  };

  // Effect to ensure data is fetched when component mounts
  useEffect(() => {
    // This will ensure products and categories are fetched immediately when the component mounts
  }, []);

  return (
    <div className="md:w-2/3 flex flex-col bg-gray-50 h-full">
      {/* Search and Categories */}
      <div className="p-4 bg-white shadow-sm">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <DropdownMenu open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
                onClick={toggleFilterDropdown}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuCheckboxItem
                checked={showInStockOnly}
                onCheckedChange={setShowInStockOnly}
              >
                In Stock Only
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={showTaxableOnly}
                onCheckedChange={setShowTaxableOnly}
              >
                Taxable Items Only
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>

              <DropdownMenuCheckboxItem
                checked={sortBy === "name"}
                onCheckedChange={(checked) => checked && setSortBy("name")}
              >
                Name
                {sortBy === "name" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={sortBy === "price"}
                onCheckedChange={(checked) => checked && setSortBy("price")}
              >
                Price (Low to High)
                {sortBy === "price" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={sortBy === "newest"}
                onCheckedChange={(checked) => checked && setSortBy("newest")}
              >
                Newest First
                {sortBy === "newest" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
            onClick={toggleViewMode}
            title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
          >
            {viewMode === "grid" ? (
              <List className="h-5 w-5" />
            ) : (
              <Grid className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="flex overflow-x-auto scrollbar-hide pb-2 gap-2">
          <button
            className={`${selectedCategory === null ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200'} rounded-full px-4 py-1 text-sm whitespace-nowrap flex-shrink-0 hover:bg-gray-50`}
            onClick={() => setSelectedCategory(null)}
          >
            All Items
          </button>

          {isLoadingCategories ? (
            // Show loading skeletons for categories
            Array(4).fill(0).map((_, index) => (
              <Skeleton key={index} className="h-7 w-24 rounded-full flex-shrink-0" />
            ))
          ) : (
            // Show actual categories
            categories && categories.map((category: Category) => (
              <button
                key={category.id}
                className={`${selectedCategory === category.id ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200'} rounded-full px-4 py-1 text-sm whitespace-nowrap flex-shrink-0 hover:bg-gray-50`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Products Grid or List */}
      <div className={`flex-1 p-4 overflow-y-auto ${viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col gap-2"}`}>
        {isLoadingProducts ? (
          <ProductsLoading />
        ) : isProductsError ? (
          <div className="col-span-full text-center py-10">
            <p className="text-danger">Failed to load products. Please try again.</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">No products found.</p>
          </div>
        ) : viewMode === "grid" ? (
          // Grid view
          sortedProducts.map((product: Product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))
        ) : (
          // List view
          sortedProducts.map((product: Product) => (
            <ProductListItem
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              getSeverityColor={(severity: string) => {
                switch (severity) {
                  case "severe": return "bg-red-100 text-red-800 border-red-200";
                  case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
                  case "mild": return "bg-blue-100 text-blue-800 border-blue-200";
                  default: return "bg-gray-100 text-gray-800 border-gray-200";
                }
              }}
              format={format}
            />
          ))
        )}
      </div>
    </div>
  );
}
