import { z } from 'zod';

/**
 * The list trims its payload with `select`, so a row carries fewer fields than a full item.
 * Two schemas rather than one optional-everything schema: the list genuinely cannot supply
 * what it did not ask for, and pretending otherwise pushes the problem into the components.
 */
export const productListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  category: z.string(),
  stock: z.number(),
  price: z.number(),
  thumbnail: z.string(),
});

/**
 * Checked against the live catalogue: every one of the 194 items carries these. `brand` is
 * absent on 92 of them, which is why it is optional and the others are not.
 */
export const productDetailSchema = productListItemSchema.extend({
  description: z.string(),
  rating: z.number(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  weight: z.number().optional(),
  warrantyInformation: z.string().optional(),
  shippingInformation: z.string().optional(),
  availabilityStatus: z.string().optional(),
});

export const productListResponseSchema = z.object({
  products: z.array(productListItemSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

/** Categories come back as objects, not the plain strings the older docs show. */
export const categorySchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export const categoryListSchema = z.array(categorySchema);

export type Product = z.infer<typeof productListItemSchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
export type Category = z.infer<typeof categorySchema>;
