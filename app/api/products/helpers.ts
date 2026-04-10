import { db } from '@/lib/db';
import { brands, categories, productImages, products, productCodes, activityLog } from '@/drizzle/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { ProductCodeInput, ProductImageInput } from '@/lib/validations/product';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | DbTransaction;

export type DetailedProduct = typeof products.$inferSelect & {
  categoryName: string | null;
  brandName: string | null;
  images: Array<typeof productImages.$inferSelect>;
  codes: Array<typeof productCodes.$inferSelect>;
};

export function normalizeIncomingImages(
  images: ProductImageInput[] | undefined,
  imageUrl?: string,
  imagePublicId?: string,
) {
  const normalized = (images ?? [])
    .filter((image) => image.imageUrl && image.imagePublicId)
    .map((image, index) => ({
      imageUrl: image.imageUrl,
      imagePublicId: image.imagePublicId,
      isPrimary: Boolean(image.isPrimary),
      order: image.order ?? index,
    }));

  if (normalized.length === 0 && imageUrl) {
    normalized.push({
      imageUrl,
      imagePublicId: imagePublicId ?? '',
      isPrimary: true,
      order: 0,
    });
  }

  const primaryIndex = normalized.findIndex((image) => image.isPrimary);
  if (normalized.length > 0 && primaryIndex === -1) {
    normalized[0].isPrimary = true;
  }

  if (primaryIndex > 0) {
    normalized.forEach((image, index) => {
      image.isPrimary = index === primaryIndex;
    });
  }

  return normalized.map((image, index) => ({
    ...image,
    order: index,
  }));
}

export function normalizeIncomingCodes(codes: ProductCodeInput[] = []) {
  const normalized = codes.map((c, i) => ({
    code: c.code.trim(),
    codeType: c.codeType,
    isPrimary: Boolean(c.isPrimary),
    isActive: c.isActive !== undefined ? c.isActive : true,
    order: c.order ?? i,
  }));

  // Ensure exactly one primary code
  const primaryIdx = normalized.findIndex((c) => c.isPrimary);
  if (normalized.length > 0 && primaryIdx === -1) {
    normalized[0].isPrimary = true;
  }
  if (primaryIdx > 0) {
    normalized.forEach((c, i) => (c.isPrimary = i === primaryIdx));
  }

  return normalized.map((c, i) => ({ ...c, order: i }));
}

export async function findOrCreateCategory(database: DbLike, name?: string) {
  const trimmedName = name?.trim();
  if (!trimmedName) return null;

  const [existingCategory] = await database
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${trimmedName})`)
    .limit(1);

  if (existingCategory) return existingCategory;

  try {
    const [createdCategory] = await database
      .insert(categories)
      .values({
        name: trimmedName,
        description: null,
        updatedAt: new Date(),
      })
      .returning({ id: categories.id, name: categories.name });

    return createdCategory;
  } catch {
    const [fallbackCategory] = await database
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(sql`lower(${categories.name}) = lower(${trimmedName})`)
      .limit(1);

    return fallbackCategory ?? null;
  }
}

export async function findOrCreateBrand(database: DbLike, name?: string) {
  const trimmedName = name?.trim();
  if (!trimmedName) return null;

  const [existingBrand] = await database
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .where(sql`lower(${brands.name}) = lower(${trimmedName})`)
    .limit(1);

  if (existingBrand) return existingBrand;

  try {
    const [createdBrand] = await database
      .insert(brands)
      .values({
        name: trimmedName,
        updatedAt: new Date(),
      })
      .returning({ id: brands.id, name: brands.name });

    return createdBrand;
  } catch {
    const [fallbackBrand] = await database
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(sql`lower(${brands.name}) = lower(${trimmedName})`)
      .limit(1);

    return fallbackBrand ?? null;
  }
}

export async function getImagesByProductIds(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, Array<typeof productImages.$inferSelect>>();

  const imageRows = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.productId), asc(productImages.order), asc(productImages.id));

  const imagesByProductId = new Map<number, Array<typeof productImages.$inferSelect>>();
  imageRows.forEach((image) => {
    const current = imagesByProductId.get(image.productId) ?? [];
    current.push(image);
    imagesByProductId.set(image.productId, current);
  });

  return imagesByProductId;
}

export async function getProductCodesByProductIds(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, Array<typeof productCodes.$inferSelect>>();

  const codeRows = await db
    .select()
    .from(productCodes)
    .where(inArray(productCodes.productId, productIds))
    .orderBy(asc(productCodes.order), asc(productCodes.id));

  const codesByProductId = new Map<number, Array<typeof productCodes.$inferSelect>>();
  codeRows.forEach((code) => {
    const current = codesByProductId.get(code.productId) ?? [];
    current.push(code);
    codesByProductId.set(code.productId, current);
  });

  return codesByProductId;
}

export function mergePrimaryImage(
  product: typeof products.$inferSelect,
  images: Array<typeof productImages.$inferSelect>,
) {
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0] ?? null;

  return {
    ...product,
    imageUrl: primaryImage?.imageUrl ?? product.imageUrl,
    imagePublicId: primaryImage?.imagePublicId ?? product.imagePublicId,
  };
}

export async function getDetailedProductByCode(code: string): Promise<DetailedProduct | null> {
  const [codeRow] = await db
    .select({ productId: productCodes.productId })
    .from(productCodes)
    .where(and(eq(productCodes.code, code), eq(productCodes.isActive, true)))
    .limit(1);

  if (!codeRow) return null;
  return getDetailedProductById(codeRow.productId);
}

export async function getDetailedProductById(id: number): Promise<DetailedProduct | null> {
  const [row] = await db
    .select({
      product: products,
      categoryName: categories.name,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!row) return null;

  const imagesByProductId = await getImagesByProductIds([row.product.id]);
  const codesByProductId = await getProductCodesByProductIds([row.product.id]);
  const images = imagesByProductId.get(row.product.id) ?? [];
  const codes = codesByProductId.get(row.product.id) ?? [];

  return {
    ...mergePrimaryImage(row.product, images),
    categoryName: row.categoryName ?? row.product.category,
    brandName: row.brandName,
    images,
    codes,
  };
}

export async function getDetailedProductByBarcode(barcode: string): Promise<DetailedProduct | null> {
  return getDetailedProductByCode(barcode);
}

export function buildSearchConditions(search?: string, category?: string, brand?: string) {
  const conditions: Array<ReturnType<typeof sql>> = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(sql`
      (
        ${products.name} ILIKE ${pattern}
        OR EXISTS (
          SELECT 1
          FROM ${productCodes}
          WHERE ${productCodes.productId} = ${products.id}
          AND ${productCodes.code} ILIKE ${pattern}
          AND ${productCodes.isActive} = true
        )
        OR ${products.description} ILIKE ${pattern}
      )
    `);
  }

  if (category) {
    const pattern = `%${category}%`;
    conditions.push(sql`
      (
        ${products.category} ILIKE ${pattern}
        OR EXISTS (
          SELECT 1
          FROM ${categories}
          WHERE ${categories.id} = ${products.categoryId}
          AND ${categories.name} ILIKE ${pattern}
        )
      )
    `);
  }

  if (brand) {
    const pattern = `%${brand}%`;
    conditions.push(sql`
      EXISTS (
        SELECT 1
        FROM ${brands}
        WHERE ${brands.id} = ${products.brandId}
        AND ${brands.name} ILIKE ${pattern}
      )
    `);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Log an activity to the activity_log table
 * @param entityType - The type of entity (e.g., 'product', 'category', 'brand')
 * @param entityId - The ID of the entity
 * @param activityType - The type of activity (e.g., 'product_created', 'product_updated')
 * @param userName - Optional username of who performed the action
 * @param changes - Optional JSON string describing what changed
 */
export async function logActivity(
  entityType: string,
  entityId: number,
  activityType: 'product_created' | 'product_updated' | 'product_deleted' | 'product_imported' | 'category_created' | 'brand_created',
  userName?: string,
  changes?: string,
) {
  try {
    await db.insert(activityLog).values({
      entityType,
      entityId,
      activityType,
      userName: userName || 'System',
      changes: changes || null,
      ipAddress: null, // Could be extracted from request headers
    });
  } catch (error) {
    // Don't throw errors for activity logging to avoid breaking main operations
    console.error('Failed to log activity:', error);
  }
}
