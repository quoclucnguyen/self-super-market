import { AdminPageClient } from '@/components/admin/AdminPageClient';
import { db } from '@/lib/db';
import { brands, categories, products, productImages } from '@/drizzle/schema';
import { and, asc, desc, inArray, sql } from 'drizzle-orm';

async function getProducts(searchParams: Awaited<Promise<{ search?: string; category?: string; page?: string }>>) {
  const { search, category, page = '1' } = searchParams;
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  const conditions: Array<ReturnType<typeof sql>> = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(sql`
      (
        ${products.name} ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM ${productCodes}
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
    conditions.push(sql`${products.category} ILIKE ${pattern}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get products for current page
  const productList = await db
    .select({
      product: products,
      categoryName: categories.name,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(categories, sql`${products.categoryId} = ${categories.id}`)
    .leftJoin(brands, sql`${products.brandId} = ${brands.id}`)
    .where(whereClause)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause);

  const productIds = productList.map((row) => row.product.id);
  const imageRows = productIds.length
    ? await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.productId), asc(productImages.order), asc(productImages.id))
    : [];

  const imageMap = new Map<number, Array<typeof productImages.$inferSelect>>();
  imageRows.forEach((image) => {
    const current = imageMap.get(image.productId) ?? [];
    current.push(image);
    imageMap.set(image.productId, current);
  });

  const productsWithImages = productList.map((row) => {
    const product = row.product;
    const images = imageMap.get(product.id) ?? [];
    const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;

    return {
      ...product,
      imageUrl: primary?.imageUrl ?? product.imageUrl,
      imagePublicId: primary?.imagePublicId ?? product.imagePublicId,
      images,
      categoryName: row.categoryName ?? product.category,
      brandName: row.brandName,
    };
  });

  const categoriesFromMaster = await db
    .select({ name: categories.name })
    .from(categories)
    .orderBy(categories.name);

  const categoriesFromProducts = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(sql`${products.category} IS NOT NULL`);

  const categoriesList = Array.from(
    new Set([
      ...categoriesFromMaster.map((c) => c.name),
      ...categoriesFromProducts.map((c) => c.category).filter((value): value is string => Boolean(value)),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  return {
    products: productsWithImages,
    pagination: {
      page: parseInt(page),
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
    categories: categoriesList,
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { products: productList, pagination, categories } = await getProducts(params);

  return (
    <div className="h-full min-h-0">
      <AdminPageClient
        initialProducts={productList}
        initialPagination={pagination}
        categories={categories}
      />
    </div>
  );
}