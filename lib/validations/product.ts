import { z } from 'zod';

// Enhanced schema with Zod v4 best practices
export const productSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters')
    .trim(),
  barcode: z.string()
    .min(1, 'Barcode is required')
    .max(50, 'Barcode must be less than 50 characters')
    .trim(),
  price: z.coerce.number().positive('Price must be positive').max(1000000, 'Price is too high'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  stockQuantity: z.coerce.number().int().min(0, 'Stock quantity cannot be negative').default(0),
  imageUrl: z.string()
    .url('Invalid image URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  imagePublicId: z.string().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productUpdateSchema = productSchema.partial().extend({
  id: z.coerce.number().int().positive('Invalid product ID'),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
