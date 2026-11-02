export type Variant = {
  sku: string;
  price: number;
  active: boolean;
  attributes?: Record<string, string>;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  brand: string;
  images: string[];
  attributes: Record<string, string>;
  variants: Variant[];
  oldPrice?: number;
  label?: string;
};
export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId?: string;
  active: boolean;
};
export type CartLine = {
  sku: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};
export type User = {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
};
export type Order = {
  id: string;
  orderCode: string;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  stockCommitted: boolean;
  items: {
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  shippingAddress: {
    recipient: string;
    phone: string;
    address: string;
    city: string;
    ward?: string;
  };
  history: {
    oldStatus?: string;
    newStatus: string;
    reason?: string;
    changedAt: string;
  }[];
};
