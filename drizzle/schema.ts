import {
  pgEnum,
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  parentCategoryId: integer('parent_category_id').references((): AnyPgColumn => categories.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('categories_name_idx').on(table.name),
  parentCategoryIdIdx: index('categories_parent_category_id_idx').on(table.parentCategoryId),
}));

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  countryOfOrigin: text('country_of_origin'),
  website: text('website'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('brands_name_idx').on(table.name),
}));

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),

  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),

  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').notNull().default('Cái'),
  weightVolume: text('weight_volume'),
  origin: text('origin'),
  ingredients: text('ingredients'),
  nutritionalInfo: text('nutritional_info'),
  usageInstructions: text('usage_instructions'),
  storageInstructions: text('storage_instructions'),
  shelfLifeDays: integer('shelf_life_days'),

  description: text('description'),

  // Backward-compatible display fields (synced from normalized tables/data)
  category: text('category'),

  stockQuantity: integer('stock_quantity').notNull().default(0),

  // Backward-compatible primary image fields (synced from product_images)
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index('category_idx').on(table.category),
  categoryIdIdx: index('products_category_id_idx').on(table.categoryId),
  brandIdIdx: index('products_brand_id_idx').on(table.brandId),
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
  codes: many(productCodes),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const productsCategoryBrandRelations = relations(products, ({ one }) => ({
  categoryRef: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brandRef: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// Product codes (barcodes/SKUs) - one product can have multiple codes
export const productCodeTypeEnum = pgEnum('product_code_type', ['barcode', 'sku']);

export const activityTypeEnum = pgEnum('activity_type', [
  'product_created',
  'product_updated',
  'product_deleted',
  'product_imported',
  'category_created',
  'brand_created',
]);

export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'product', 'category', 'brand', etc.
  entityId: integer('entity_id').notNull(), // ID of the affected entity
  activityType: activityTypeEnum('activity_type').notNull(),
  userId: integer('user_id'), // Optional: track who performed the action
  userName: text('user_name'), // Optional: store user name for display
  changes: text('changes'), // JSON string describing what changed
  ipAddress: text('ip_address'), // Optional: track IP for security
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  entityTypeIdx: index('activity_log_entity_type_idx').on(table.entityType),
  entityIdIdx: index('activity_log_entity_id_idx').on(table.entityId),
  activityTypeIdx: index('activity_log_activity_type_idx').on(table.activityType),
  createdAtIdx: index('activity_log_created_at_idx').on(table.createdAt),
}));

export const productCodes = pgTable('product_codes', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  codeType: productCodeTypeEnum('code_type').notNull().default('barcode'),
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  productIdIdx: index('product_codes_product_id_idx').on(table.productId),
  codeIdx: index('product_codes_code_idx').on(table.code),
  codeUnique: index('product_codes_code_unique').on(table.code),
}));

export const productCodesRelations = relations(productCodes, ({ one }) => ({
  product: one(products, {
    fields: [productCodes.productId],
    references: [products.id],
  }),
}));

// Type inference for better type safety
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type ProductCode = typeof productCodes.$inferSelect;
export type NewProductCode = typeof productCodes.$inferInsert;
export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
