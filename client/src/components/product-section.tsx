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

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { format } = useCurrency();

  // Helper function to get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "severe": return "bg-red-100 text-red-800 border-red-200";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "mild": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
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

          {/* Allergen badges */}
          {product.hasAllergens && Array.isArray(product.allergens) && (
            <div className="mb-2 flex flex-wrap gap-1">
              {product.allergens.map((allergen: { name: string; severity?: string }, index: number) => (
                <span
                  key={index}
                  className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(allergen.severity || 'moderate')}`}
                >
                  {allergen.name}
                </span>
              ))}
            </div>
          )}

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
            <button
              className={`text-gray-500 hover:text-primary ${!product.inStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => product.inStock && onAddToCart(product)}
              disabled={!product.inStock}
              title={product.inStock ? 'Add to cart' : 'Out of stock'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
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

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

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
  const handleAddToCart = (product: Product) => {
    if (!product.inStock) {
      toast({
        title: "Cannot add to cart",
        description: "This product is out of stock",
        variant: "destructive"
      });
      return;
    }

    addToCart(product, 1);

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  // Filter products based on search and category
  const filteredProducts = products?.filter((product: Product) => {
    // Search filter
    const matchesSearch = searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  }) ?? [];

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
          <Button variant="outline" className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </Button>
          <Button variant="outline" className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
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

      {/* Products Grid */}
      <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoadingProducts ? (
          <ProductsLoading />
        ) : isProductsError ? (
          <div className="col-span-full text-center py-10">
            <p className="text-danger">Failed to load products. Please try again.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">No products found.</p>
          </div>
        ) : (
          filteredProducts.map((product: Product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))
        )}
      </div>
    </div>
  );
}
