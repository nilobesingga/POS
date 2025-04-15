import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product, Category } from "@shared/schema";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const stockStatus = !product.inStock
    ? { text: "Out of stock", className: "bg-danger" }
    : product.stockQuantity <= 5
    ? { text: "Low stock", className: "bg-warning" }
    : { text: "In stock", className: "bg-primary" };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="h-36 bg-gray-200 relative">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover"
        />
        <div className={`absolute bottom-0 right-0 m-2 ${stockStatus.className} text-white text-xs font-semibold px-2 py-1 rounded`}>
          {stockStatus.text}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium">{product.name}</h3>
        <div className="flex justify-between items-center mt-2">
          <p className="font-bold text-primary">${Number(product.price).toFixed(2)}</p>
          <button
            className={`text-gray-500 hover:text-primary ${!product.inStock ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => product.inStock && onAddToCart(product)}
            disabled={!product.inStock}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
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
  const filteredProducts = products ? products.filter((product: Product) => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    // Category filter
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) : [];
  
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
