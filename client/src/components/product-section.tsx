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
  getSeverityColor: (severity: string) => string;
  format: (value: number | string | null | undefined) => string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  categoryName?: string;
}

function ProductCard({ product, onAddToCart, getSeverityColor, format, isFavorite = false, onToggleFavorite = () => {}, categoryName }: ProductCardProps) {
  const [showAllergens, setShowAllergens] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState("");
  const [addedToCart, setAddedToCart] = useState(false);

  // Handle quantity change with validation
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);

    // Basic validation for numeric input
    if (isNaN(newValue)) {
      setQuantity(1);
      setQuantityError("Please enter a valid number");
      return;
    }

    // Validate against stock quantity if available
    if (product.stockQuantity !== undefined && newValue > product.stockQuantity) {
      setQuantity(product.stockQuantity);
      setQuantityError(`Maximum available: ${product.stockQuantity}`);
      return;
    }

    // Success case
    setQuantity(newValue);
    setQuantityError("");
  };

  // Function to handle quick add with animation
  const handleQuickAdd = (qty: number) => {
    if (product.inStock) {
      onAddToCart(product, qty);
      // Show added animation
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 750);
    }
  };

  // Function to handle custom quantity add
  const handleAddToCart = () => {
    if (product.inStock && quantity > 0) {
      onAddToCart(product, quantity);
      setShowQuantity(false);
      // Show added animation
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 750);
    }
  };

  // Quick add quantities
  const quickAddOptions = [1, 2, 5, 10];

  return (
    <div
      className={`flex flex-col bg-white rounded-lg transition-all duration-300 ${
        addedToCart
          ? 'ring-2 ring-primary shadow-md transform scale-[1.02]'
          : 'shadow-sm hover:shadow-md hover:translate-y-[-2px]'
      } overflow-hidden h-full relative`}
      onMouseEnter={() => setShowQuickAdd(true)}
      onMouseLeave={() => setShowQuickAdd(false)}
    >
      {/* Product Image */}
      <div className="w-full h-36 relative overflow-hidden group">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400">No image</span>
          </div>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white font-medium px-3 py-1 bg-red-500 rounded-full text-xs shadow-md">
              Out of Stock
            </span>
          </div>
        )}

        {/* Category badge - Show at top left */}
        {categoryName && (
          <div className="absolute top-2 left-2">
            <span className="bg-black/40 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              {categoryName}
            </span>
          </div>
        )}

        {/* Allergen warning icon */}
        {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
          <Popover open={showAllergens} onOpenChange={setShowAllergens}>
            <PopoverTrigger asChild>
              <button
                className="absolute top-2 right-2 bg-yellow-500 rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-yellow-600 transition-colors duration-200"
                onClick={() => setShowAllergens(true)}
              >
                <AlertTriangle className="h-4 w-4 text-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 shadow-xl border border-yellow-100" side="right">
              <h4 className="font-bold text-sm mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                Allergens
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
            </PopoverContent>
          </Popover>
        )}

        {/* Quick-add buttons overlay that appears on hover with improved gradient */}
        {product.inStock && (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 transition-all duration-300 ${
              showQuickAdd ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="flex justify-center gap-1">
              {quickAddOptions.map(qty => (
                <button
                  key={qty}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAdd(qty);
                  }}
                  className={`h-9 w-9 rounded-md flex items-center justify-center transition-all duration-200 ${
                    qty === 1
                      ? 'bg-primary text-white hover:bg-blue-600 shadow-md'
                      : 'bg-white/90 text-primary hover:bg-white shadow-sm'
                  }`}
                  title={`Add ${qty} ${qty === 1 ? 'item' : 'items'}`}
                >
                  <span className="text-sm font-medium">{qty}</span>
                </button>
              ))}
              <button
                className="h-9 w-9 rounded-md flex items-center justify-center bg-white/90 text-primary hover:bg-white shadow-sm transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuantity(true);
                }}
                title="Custom quantity"
              >
                <span>...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product details with improved spacing and typography */}
      <div className="p-3 flex flex-col flex-grow">
        <div className="flex items-center">
          <h3 className="font-medium text-gray-900 truncate leading-tight">{product.name}</h3>
          {/* Allergen indicator beside product name */}
          {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
            <span
              className="ml-2 text-yellow-500 cursor-help"
              title="Contains allergens"
              onClick={() => setShowAllergens(true)}
            >
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
        </div>

        {typeof product.description === 'string' && product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 mb-1">
            {product.description}
          </p>
        )}

        {/* Tags, badges or attributes - show allergens as tags */}
        {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 my-1">
            {product.allergens.slice(0, 2).map((allergen: { name: string; severity?: string }, index: number) => (
              <span
                key={index}
                className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200"
              >
                {allergen.name}
              </span>
            ))}
            {product.allergens.length > 2 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200 cursor-pointer"
                onClick={() => setShowAllergens(true)}
              >
                +{product.allergens.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Stock indicator with improved styling */}
        {product.stockQuantity !== undefined && (
          <div className={`text-xs mt-1 ${
            product.stockQuantity > 10
              ? 'text-green-600'
              : product.stockQuantity > 0
                ? 'text-amber-600'
                : 'text-red-600'
          }`}>
            {product.stockQuantity > 0
              ? `In stock: ${product.stockQuantity}`
              : 'Out of stock'}
          </div>
        )}

        {/* Price at the bottom with more prominence */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="font-bold text-primary text-lg">{format(Number(product.price))}</p>

          {/* Add to cart button - now using conditional rendering for cleaner UI */}
          <Button
            size="sm"
            onClick={() => product.inStock && (showQuickAdd ? handleQuickAdd(1) : setShowQuickAdd(true))}
            disabled={!product.inStock}
            className={`transition-all duration-200 ${
              !product.inStock
                ? 'bg-gray-100 text-gray-400'
                : addedToCart
                  ? 'bg-green-600 text-white'
                  : 'bg-primary text-white hover:bg-blue-600'
            }`}
          >
            {addedToCart ? 'Added!' : 'Add'}
          </Button>

          {/* Custom quantity popover - now with improved styling */}
          <Popover open={showQuantity && product.inStock} onOpenChange={(open) => product.inStock && setShowQuantity(open)}>
            <PopoverContent className="w-64 p-3 shadow-xl border border-gray-100 rounded-xl" side="top" align="end">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">{product.name}</h4>
                  <span className="text-sm text-gray-500">
                    {product.stockQuantity !== undefined ? `${product.stockQuantity} available` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="cardQuantity" className="text-sm font-medium">Quantity:</label>
                  <div className="flex-1">
                    <Input
                      id="cardQuantity"
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

                {/* Quick preset buttons with improved styling */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 15, 20].map(qty => (
                    <button
                      key={qty}
                      className="p-1.5 border rounded text-sm hover:bg-primary hover:text-white hover:border-primary transition-colors duration-150"
                      onClick={() => setQuantity(qty)}
                    >
                      {qty}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowQuantity(false);
                    }}
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

      {/* "Added to cart" animation overlay */}
      {addedToCart && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-full p-2 shadow-lg">
            <Check className="h-6 w-6 text-green-500"/>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductListItem({ product, onAddToCart, getSeverityColor, format, isFavorite = false, onToggleFavorite = () => {}, categoryName }: ProductCardProps) {
  const [showListAllergens, setShowListAllergens] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState("");
  const [addedToCart, setAddedToCart] = useState(false);

  // Handle quantity change with validation
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);

    // Basic validation for numeric input
    if (isNaN(newValue)) {
      setQuantity(1);
      setQuantityError("Please enter a valid number");
      return;
    }

    // Validate against stock quantity if available
    if (product.stockQuantity !== undefined && newValue > product.stockQuantity) {
      setQuantity(product.stockQuantity);
      setQuantityError(`Maximum available: ${product.stockQuantity}`);
      return;
    }

    // Success case
    setQuantity(newValue);
    setQuantityError("");
  };

  // Function to handle quick add with animation
  const handleQuickAdd = (qty: number) => {
    if (product.inStock) {
      onAddToCart(product, qty);
      // Show added animation
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 750);
    }
  };

  // Function to handle custom quantity add
  const handleAddToCart = () => {
    if (product.inStock && quantity > 0) {
      onAddToCart(product, quantity);
      setShowQuantity(false);
      // Show added animation
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 750);
    }
  };

  // Quick add quantities
  const quickAddOptions = [1, 2, 5, 10];

  return (
    <div
      className={`flex bg-white rounded-lg transition-all duration-300 ${
        addedToCart
          ? 'ring-2 ring-primary shadow-md'
          : 'shadow-sm hover:shadow-md hover:translate-x-[-1px]'
      } relative p-3`}
      onMouseEnter={() => setShowQuickAdd(true)}
      onMouseLeave={() => setShowQuickAdd(false)}
    >
      {/* Product image with hover effect */}
      <div className="w-20 h-20 relative flex-shrink-0 overflow-hidden rounded-md group">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md backdrop-blur-sm">
            <span className="text-white font-medium px-2 py-0.5 bg-red-500 rounded-full text-xs shadow-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Category label (if present) */}
        {categoryName && (
          <div className="absolute top-0 left-0 px-1.5 py-0.5 text-xs bg-black/40 text-white rounded-br-md backdrop-blur-sm">
            {categoryName}
          </div>
        )}

        {/* Allergen warning icon for list view */}
        {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
          <Popover open={showListAllergens} onOpenChange={setShowListAllergens}>
            <PopoverTrigger asChild>
              <button
                className="absolute top-0 right-0 bg-yellow-500 rounded-full w-5 h-5 flex items-center justify-center shadow-sm -mt-1 -mr-1 hover:bg-yellow-600 transition-colors duration-200"
                onClick={() => setShowListAllergens(true)}
              >
                <AlertTriangle className="h-3 w-3 text-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 shadow-xl border border-yellow-100" side="right">
              <h4 className="font-bold text-sm mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                Allergens
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
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Product details */}
      <div className="ml-4 flex-1 flex flex-col min-w-0">
        <div className="flex items-center">
          <h3 className="font-medium text-gray-900 truncate leading-tight">{product.name}</h3>
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
          <p className="text-xs text-gray-500 line-clamp-2 mb-1">
            {product.description}
          </p>
        )}

        {/* Allergen tags */}
        {product.hasAllergens && Array.isArray(product.allergens) && product.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {product.allergens.slice(0, 2).map((allergen: { name: string; severity?: string }, index: number) => (
              <span
                key={index}
                className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200"
              >
                {allergen.name}
              </span>
            ))}
            {product.allergens.length > 2 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200 cursor-pointer"
                onClick={() => setShowListAllergens(true)}
              >
                +{product.allergens.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Stock indicator with improved styling */}
        {product.stockQuantity !== undefined && (
          <div className={`text-xs mb-1 ${
            product.stockQuantity > 10
              ? 'text-green-600'
              : product.stockQuantity > 0
                ? 'text-amber-600'
                : 'text-red-600'
          }`}>
            {product.stockQuantity > 0
              ? `In stock: ${product.stockQuantity}`
              : 'Out of stock'}
          </div>
        )}

        {/* Price and add buttons on same line */}
        <div className="mt-auto flex items-center justify-between">
          <p className="font-bold text-primary text-lg">{format(Number(product.price))}</p>

          {/* Quick Add buttons or standard Add to Cart button */}
          <div className="flex items-center">
            {product.inStock ? (
              showQuickAdd ? (
                <div className="flex items-center space-x-1.5">
                  {quickAddOptions.map(qty => (
                    <button
                      key={qty}
                      onClick={() => handleQuickAdd(qty)}
                      className={`h-8 w-9 rounded-md flex items-center justify-center transition-all duration-200 shadow-sm ${
                        qty === 1
                          ? 'bg-primary text-white hover:bg-blue-600'
                          : 'bg-blue-50 text-primary hover:bg-blue-100 border border-blue-200'
                      }`}
                      title={`Add ${qty} ${qty === 1 ? 'item' : 'items'}`}
                    >
                      <span className="text-sm font-medium">{qty}</span>
                    </button>
                  ))}

                  {/* Custom quantity button */}
                  <button
                    className="w-8 h-8 rounded-md flex items-center justify-center border border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => {
                      setShowQuickAdd(false);
                      setShowQuantity(true);
                    }}
                    title="Custom quantity"
                  >
                    <span className="text-xs">...</span>
                  </button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowQuickAdd(true)}
                  className={`transition-all duration-200 ${
                    addedToCart
                      ? 'bg-green-600 text-white'
                      : 'bg-primary text-white hover:bg-blue-600'
                  }`}
                >
                  {addedToCart ? 'Added!' : 'Add'}
                </Button>
              )
            ) : (
              <Button
                size="sm"
                disabled
                className="bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                Out of Stock
              </Button>
            )}
          </div>

          {/* Custom quantity popover */}
          <Popover open={showQuantity} onOpenChange={(open) => product.inStock && setShowQuantity(open)}>
            <PopoverContent className="w-64 p-3 shadow-xl border border-gray-100 rounded-xl" side="top" align="end">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">{product.name}</h4>
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

                {/* Quick preset buttons for common quantities */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 15, 20].map(qty => (
                    <button
                      key={qty}
                      className="p-1.5 border rounded text-sm hover:bg-primary hover:text-white hover:border-primary transition-colors duration-150"
                      onClick={() => setQuantity(qty)}
                    >
                      {qty}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowQuantity(false);
                    }}
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

      {/* "Added to cart" animation overlay */}
      {addedToCart && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none rounded-lg">
          <div className="bg-white rounded-full p-2 shadow-lg">
            <Check className="h-6 w-6 text-green-500"/>
          </div>
        </div>
      )}
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
  const { format } = useCurrency();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [showTaxableOnly, setShowTaxableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "price" | "newest">("name");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState<number[]>([]);

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

  // Get the category name for a product
  const getCategoryName = (categoryId: number | null): string => {
    if (!categoryId) return '';
    const category = categories?.find(cat => cat.id === categoryId);
    return category ? category.name : '';
  };

  // Handle keydown event for barcode/SKU scanning - Only process on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Enter key is pressed and there's content in the search
    if (e.key === "Enter" && searchQuery.trim()) {
      // Prevent default form submission
      e.preventDefault();

      // Process scan/search
      processScan(searchQuery);
    }
  };

  // Simplified input change handler - just update the search query
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Process the scanned barcode/SKU
  const processScan = (code: string) => {
    if (!code || !products) return;

    // Try to find the product by barcode or SKU
    const foundProduct = products.find(p =>
      p.barcode === code ||
      p.sku === code ||
      p.id?.toString() === code
    );

    if (foundProduct) {
      // Add to cart if product is found
      if (foundProduct.inStock) {
        handleAddToCart(foundProduct, 1);
        // Clear search after adding to cart
        setSearchQuery("");
      } else {
        toast({
          title: "Product out of stock",
          description: `${foundProduct.name} is currently out of stock`,
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Product not found",
        description: `No product found with code: ${code}`,
        variant: "destructive"
      });
    }
  };

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

  // Toggle favorite status of a product
  const handleToggleFavorite = (productId: number) => {
    setFavoriteProducts(prevFavorites => {
      if (prevFavorites.includes(productId)) {
        return prevFavorites.filter(id => id !== productId);
      } else {
        return [...prevFavorites, productId];
      }
    });
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
              placeholder="Search products or scan barcode/SKU... (Press Enter)"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoFocus
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
              getSeverityColor={(severity: string) => {
                switch (severity) {
                  case "severe": return "bg-red-100 text-red-800 border-red-200";
                  case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
                  case "mild": return "bg-blue-100 text-blue-800 border-blue-200";
                  default: return "bg-gray-100 text-gray-800 border-gray-200";
                }
              }}
              format={format}
              isFavorite={favoriteProducts.includes(Number(product.id))}
              onToggleFavorite={() => handleToggleFavorite(Number(product.id))}
              categoryName={getCategoryName(product.categoryId)}
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
              isFavorite={favoriteProducts.includes(Number(product.id))}
              onToggleFavorite={() => handleToggleFavorite(Number(product.id))}
              categoryName={getCategoryName(product.categoryId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
