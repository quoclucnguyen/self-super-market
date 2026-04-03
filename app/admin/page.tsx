import { ProductList } from '@/components/admin/ProductList';
import { SearchBar } from '@/components/admin/SearchBar';
import { db } from '@/lib/db';
import { products, type Product } from '@/drizzle/schema';
import { sql, like, or, and, desc } from 'drizzle-orm';

async function getProducts(searchParams: Awaited<Promise<{ search?: string; category?: string; page?: string }>>) {
  const { search, category, page = '1' } = searchParams;
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  // Build conditions using Drizzle's type-safe operators
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(products.name, `%${search}%`),
        like(products.barcode, `%${search}%`),
        like(products.description || '', `%${search}%`)
      )
    );
  }
  if (category) {
    conditions.push(sql`${products.category} = ${category}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get products
  const productList = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause);

  // Get unique categories
  const categoriesResult = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(sql`${products.category} IS NOT NULL`)
    .orderBy(products.category);

  const categories = categoriesResult.map((c) => c.category).filter(Boolean) as string[];

  return {
    products: productList as Product[],
    pagination: {
      page: parseInt(page),
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
    categories,
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Products
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your product inventory ({pagination.total} total)
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar categories={categories} />

      {/* Products List */}
      <ProductList
        products={productList}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        searchParams={params}
      />
    </div>
  );
}