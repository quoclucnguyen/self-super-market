import { db } from '@/lib/db';
import { brands, categories, productImages, products } from '@/drizzle/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { ProductImageInput } from '@/lib/validations/product';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | DbTransaction;

export type DetailedProduct = typeof products.$inferSelect & {
  categoryName: string | null;
  brandName: string | null;
  images: Array<typeof productImages.$inferSelect>;
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

  if (normalized.length === 0 && imageUrl && imagePublicId) {
    normalized.push({
      imageUrl,
      imagePublicId,
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
  const images = imagesByProductId.get(row.product.id) ?? [];

  return {
    ...mergePrimaryImage(row.product, images),
    categoryName: row.categoryName ?? row.product.category,
    brandName: row.brandName,
    images,
  };
}

export async function getDetailedProductByBarcode(barcode: string): Promise<DetailedProduct | null> {
  const [row] = await db
    .select({
      product: products,
      categoryName: categories.name,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.barcode, barcode))
    .limit(1);

  if (!row) return null;

  const imagesByProductId = await getImagesByProductIds([row.product.id]);
  const images = imagesByProductId.get(row.product.id) ?? [];

  return {
    ...mergePrimaryImage(row.product, images),
    categoryName: row.categoryName ?? row.product.category,
    brandName: row.brandName,
    images,
  };
}

export function buildSearchConditions(search?: string, category?: string, brand?: string) {
  const conditions: Array<ReturnType<typeof sql>> = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(sql`
      (
        ${products.name} ILIKE ${pattern}
        OR ${products.barcode} ILIKE ${pattern}
        OR ${products.sku} ILIKE ${pattern}
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
