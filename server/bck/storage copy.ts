import {
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  products, type Product, type InsertProduct,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<{order: Order, items: OrderItem[]} | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;

  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;

  // Reports
  getSalesReport(startDate: Date, endDate: Date): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;

  private userId: number;
  private categoryId: number;
  private productId: number;
  private orderId: number;
  private orderItemId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.orderItems = new Map();

    this.userId = 1;
    this.categoryId = 1;
    this.productId = 1;
    this.orderId = 1;
    this.orderItemId = 1;

    // Initialize with sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Create default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      displayName: "Admin User",
      role: "admin"
    });

    // Create a cashier user
    this.createUser({
      username: "cashier",
      password: "cashier123",
      displayName: "John Smith",
      role: "cashier"
    });

    // Create categories
    const beverages = this.createCategory({ name: "Beverages" });
    const food = this.createCategory({ name: "Food" });
    const desserts = this.createCategory({ name: "Desserts" });
    const merchandise = this.createCategory({ name: "Merchandise" });

    // Create sample products
    this.createProduct({
      name: "Cappuccino",
      price: 4.50,
      description: "Espresso with steamed milk and foam",
      categoryId: beverages.id,
      imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
      sku: "BEV001",
      inStock: true,
      stockQuantity: 100
    });

    this.createProduct({
      name: "Espresso",
      price: 3.50,
      description: "Strong black coffee brewed by forcing hot water through ground coffee beans",
      categoryId: beverages.id,
      imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd",
      sku: "BEV002",
      inStock: true,
      stockQuantity: 100
    });

    this.createProduct({
      name: "Vanilla Latte",
      price: 5.00,
      description: "Espresso with steamed milk and vanilla syrup",
      categoryId: beverages.id,
      imageUrl: "https://images.unsplash.com/photo-1579888944880-d98341245702",
      sku: "BEV003",
      inStock: true,
      stockQuantity: 100
    });

    this.createProduct({
      name: "Chicken Sandwich",
      price: 7.50,
      description: "Grilled chicken with lettuce, tomato, and mayo on a brioche bun",
      categoryId: food.id,
      imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772",
      sku: "FOOD001",
      inStock: true,
      stockQuantity: 15
    });

    this.createProduct({
      name: "Butter Croissant",
      price: 3.75,
      description: "Flaky, buttery croissant",
      categoryId: food.id,
      imageUrl: "https://images.unsplash.com/photo-1550617931-e17a7b70dce2",
      sku: "FOOD002",
      inStock: true,
      stockQuantity: 20
    });

    this.createProduct({
      name: "Caesar Salad",
      price: 8.25,
      description: "Romaine lettuce with Caesar dressing, croutons, and parmesan",
      categoryId: food.id,
      imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
      sku: "FOOD003",
      inStock: true,
      stockQuantity: 10
    });

    this.createProduct({
      name: "Ceramic Coffee Mug",
      price: 12.99,
      description: "Ceramic mug with logo",
      categoryId: merchandise.id,
      imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87",
      sku: "MERCH001",
      inStock: false,
      stockQuantity: 0
    });

    this.createProduct({
      name: "Chocolate Chip Cookies",
      price: 2.50,
      description: "Freshly baked chocolate chip cookies",
      categoryId: desserts.id,
      imageUrl: "https://images.unsplash.com/photo-1559181567-c3190ca9959b",
      sku: "DESS001",
      inStock: true,
      stockQuantity: 24
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.categoryId === categoryId
    );
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productId++;
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, productUpdate: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updatedProduct = { ...product, ...productUpdate };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderWithItems(id: number): Promise<{order: Order, items: OrderItem[]} | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const items = Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === id
    );

    return { order, items };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const id = this.orderId++;
    const newOrder: Order = { ...order, id };
    this.orders.set(id, newOrder);

    // Create order items
    for (const item of items) {
      const orderItem: OrderItem = {
        ...item,
        id: this.orderItemId++,
        orderId: id
      };
      this.orderItems.set(orderItem.id, orderItem);

      // Update product stock
      const product = this.products.get(orderItem.productId);
      if (product) {
        const newStockQuantity = product.stockQuantity - orderItem.quantity;
        const inStock = newStockQuantity > 0;
        this.updateProduct(product.id, {
          stockQuantity: newStockQuantity,
          inStock
        });
      }
    }

    return newOrder;
  }

  // Order Items
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId
    );
  }

  // Reports
  async getSalesReport(startDate: Date, endDate: Date): Promise<any> {
    const ordersInRange = Array.from(this.orders.values()).filter(
      (order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      }
    );

    const totalSales = ordersInRange.reduce((sum, order) => sum + Number(order.total), 0);
    const orderCount = ordersInRange.length;

    // Get top products
    const itemsMap = new Map<number, { productId: number, name: string, quantity: number, total: number }>();

    for (const order of ordersInRange) {
      const items = await this.getOrderItems(order.id);
      for (const item of items) {
        const product = await this.getProduct(item.productId);
        if (product) {
          const existing = itemsMap.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += Number(item.price) * item.quantity;
          } else {
            itemsMap.set(item.productId, {
              productId: item.productId,
              name: product.name,
              quantity: item.quantity,
              total: Number(item.price) * item.quantity
            });
          }
        }
      }
    }

    const topProducts = Array.from(itemsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      startDate,
      endDate,
      totalSales,
      orderCount,
      topProducts
    };
  }
}

export const storage = new MemStorage();
