import { pgTable, serial, text, numeric, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  barcode: text('barcode').notNull().unique(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  category: text('category'),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  barcodeIdx: index('barcode_idx').on(table.barcode),
  categoryIdx: index('category_idx').on(table.category),
}));

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  imagePublicId: text('image_public_id').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productIdIdx: index('product_images_product_id_idx').on(table.productId),
}));

export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// Type inference for better type safety
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
