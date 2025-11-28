import { QueryOptions } from './api';

export interface ProductFilters extends QueryOptions {
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
  brand?: string;
  price: {
    regular: number;
    sale?: number;
    cost: number;
    margin: number;
    currency: string;
  };
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    trackQuantity: boolean;
    allowBackorders: boolean;
    location?: string;
  };
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
    unit: 'cm' | 'inch';
    weightUnit: 'kg' | 'lb';
  };
  shipping: {
    shippable: boolean;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    shippingClass?: string;
  };
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    slug: string;
  };
  visibility: {
    published: boolean;
    featured: boolean;
    visibleInCatalog: boolean;
    visibleInSearch: boolean;
  };
  status: 'draft' | 'active' | 'inactive' | 'archived';
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  salePrice?: number;
  inventory: {
    quantity: number;
    trackQuantity: boolean;
  };
  attributes: Array<{
    name: string;
    value: string;
  }>;
  image?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isDefault: boolean;
  status: 'active' | 'inactive';
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  options?: string[];
  required: boolean;
  visible: boolean;
  variation: boolean; // Can be used for variants
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
  size: {
    width: number;
    height: number;
    fileSize: number;
  };
}

export interface ProductCategory {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  categoryId: string;
  subcategoryId?: string;
  brand?: string;
  price: {
    regular: number;
    sale?: number;
    cost: number;
  };
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    trackQuantity: boolean;
    allowBackorders: boolean;
  };
  variants?: Omit<ProductVariant, 'id'>[];
  attributes?: Omit<ProductAttribute, 'id'>[];
  images?: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
  }>;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  shipping?: {
    shippable: boolean;
    weight?: number;
    shippingClass?: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    slug?: string;
  };
  visibility?: {
    published: boolean;
    featured: boolean;
    visibleInCatalog: boolean;
    visibleInSearch: boolean;
  };
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  status?: 'draft' | 'active' | 'inactive' | 'archived';
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    category?: string;
    status?: string;
    search?: string;
    priceRange?: {
      min: number;
      max: number;
    };
  };
}

export interface ProductAnalytics {
  summary: {
    totalProducts: number;
    activeProducts: number;
    draftProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalValue: number;
    averagePrice: number;
  };
  performance: {
    topSelling: Array<{
      productId: string;
      name: string;
      sku: string;
      sales: number;
      revenue: number;
      views: number;
      conversionRate: number;
    }>;
    lowPerforming: Array<{
      productId: string;
      name: string;
      sku: string;
      sales: number;
      revenue: number;
      views: number;
      daysWithoutSale: number;
    }>;
  };
  categoryAnalysis: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
    totalSales: number;
    totalRevenue: number;
    averagePrice: number;
    topProduct: {
      id: string;
      name: string;
      sales: number;
    };
  }>;
  inventoryAnalysis: {
    stockLevels: Array<{
      level: 'out_of_stock' | 'low_stock' | 'adequate' | 'overstocked';
      count: number;
      value: number;
    }>;
    turnoverRate: number;
    averageDaysToSell: number;
    stockValue: number;
  };
  trends: {
    salesTrend: Array<{
      period: string;
      sales: number;
      revenue: number;
      newProducts: number;
    }>;
    categoryTrends: Array<{
      categoryId: string;
      categoryName: string;
      trend: 'up' | 'down' | 'stable';
      growth: number;
    }>;
  };
}

export interface BulkProductAction {
  productIds: string[];
  action: 'update_status' | 'update_category' | 'update_pricing' | 'delete' | 'export';
  data: {
    status?: 'active' | 'inactive' | 'archived';
    categoryId?: string;
    priceAdjustment?: {
      type: 'percentage' | 'fixed';
      value: number;
      operation: 'increase' | 'decrease';
    };
    format?: 'csv' | 'excel';
  };
}

// Product events for real-time updates
export interface ProductEvent {
  id: string;
  productId: string;
  type: 'created' | 'updated' | 'status_changed' | 'inventory_updated' | 'deleted';
  data: Partial<Product>;
  timestamp: string;
  merchantId: string;
}