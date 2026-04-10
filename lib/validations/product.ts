import { z } from 'zod';

export const productImageSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  imagePublicId: z.string().min(1, 'Image public ID is required'),
  isPrimary: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

export const productCodeSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1, 'Code is required').max(100, 'Code too long').trim(),
  codeType: z.enum(['barcode', 'sku'], { message: 'Code type required' }),
  isPrimary: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  order: z.coerce.number().int().min(0).optional(),
});

const optionalPriceSchema = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'number' && Number.isNaN(value)) {
      return undefined;
    }

    return value;
  },
  z.coerce.number().positive('Price must be positive').max(1000000, 'Price is too high').optional(),
);

// Enhanced schema with Zod v4 best practices
export const productSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters')
    .trim(),

  // Product codes (barcodes/SKUs)
  codes: z.array(productCodeSchema)
    .min(1, 'At least one barcode is required')
    .refine(
      (codes) => codes.some((c) => c.codeType === 'barcode'),
      'At least one barcode is required',
    )
    .refine(
      (codes) => codes.filter((c) => c.isPrimary).length <= 1,
      'Only one primary code allowed',
    )
    .refine(
      (codes) => {
        const codeValues = codes.map((c) => c.code.toLowerCase());
        return new Set(codeValues).size === codeValues.length;
      },
      'Codes must be unique within product',
    )
    .optional(),

  categoryId: z.coerce.number().int().positive().optional(),
  categoryName: z.string()
    .max(100, 'Category name must be less than 100 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  brandId: z.coerce.number().int().positive().optional(),
  brandName: z.string()
    .max(100, 'Brand name must be less than 100 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  price: optionalPriceSchema,
  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be less than 20 characters')
    .trim(),
  weightVolume: z.string()
    .max(50, 'Weight/volume must be less than 50 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  origin: z.string()
    .max(50, 'Origin must be less than 50 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  ingredients: z.string()
    .max(5000, 'Ingredients must be less than 5000 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  nutritionalInfo: z.string()
    .max(5000, 'Nutritional info must be less than 5000 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  usageInstructions: z.string()
    .max(5000, 'Usage instructions must be less than 5000 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  storageInstructions: z.string()
    .max(5000, 'Storage instructions must be less than 5000 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  shelfLifeDays: z.coerce.number().int().min(0, 'Shelf life must be >= 0').optional(),

  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  // Backward-compatible category text field
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  stockQuantity: z.coerce.number().int().min(0, 'Stock quantity cannot be negative').optional(),

  images: z.array(productImageSchema)
    .max(20, 'Maximum 20 images')
    .optional(),

  // Backward-compatible primary image fields
  imageUrl: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().url('Invalid image URL').optional(),
  ),
  imagePublicId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type ProductRawInput = z.input<typeof productSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductParsed = ProductInput;
export type ProductImageInput = z.infer<typeof productImageSchema>;
export type ProductCodeInput = z.infer<typeof productCodeSchema>;

export const productUpdateSchema = productSchema.partial();

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
