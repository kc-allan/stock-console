export type Product = {
  id: number;
  title: string;
  category: string;
  stock: number;
  price: number;
  thumbnail: string;
};

/** The detail route needs more than the list does. */
export type ProductDetail = Product & {
  description: string;
  brand?: string;
  sku?: string;
  rating: number;
  weight?: number;
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
};

export type ProductListResponse = {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
};

export type Category = {
  slug: string;
  name: string;
};
