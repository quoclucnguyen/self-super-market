import { db } from '@/lib/db';
import { products, productCodes, productImages, activityLog } from '@/drizzle/schema';
import { desc, asc, inArray, sql, lt, and, gte, eq } from 'drizzle-orm';
import { DashboardKPICard } from '@/components/dashboard/DashboardKPICard';
import { DashboardProductTable } from '@/components/dashboard/DashboardProductTable';
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { DashboardSearch, type DashboardFilters } from '@/components/dashboard/DashboardSearch';
import { Package, AlertTriangle, BarCode3, TrendingUp, ClipboardCheck } from 'lucide-react';

interface DashboardSearchParams {
  search?: string;
  category?: string;
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy?: 'recent' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
}

async function getDashboardData(searchParams: DashboardSearchParams) {
  const { search = '', category = '', stockStatus = 'all', sortBy = 'recent' } = searchParams;

  // Build search conditions
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
    conditions.push(sql`${products.category} ILIKE ${'%' + category + '%'}`);
  }

  if (stockStatus === 'in-stock') {
    conditions.push(sql`${products.stockQuantity} > 10`);
  } else if (stockStatus === 'low-stock') {
    conditions.push(sql`${products.stockQuantity} <= 10 AND ${products.stockQuantity} > 0`);
  } else if (stockStatus === 'out-of-stock') {
    conditions.push(sql`${products.stockQuantity} = 0`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build sort condition
  let orderByClause = desc(products.createdAt);
  if (sortBy === 'name-asc') orderByClause = asc(products.name);
  else if (sortBy === 'name-desc') orderByClause = desc(products.name);
  else if (sortBy === 'price-asc') orderByClause = asc(sql`CAST(${products.price} AS NUMERIC)`);
  else if (sortBy === 'price-desc') orderByClause = desc(sql`CAST(${products.price} AS NUMERIC)`);

  // Get total counts for KPIs
  const [kpiData] = await db
    .select({
      totalProducts: sql<number>`count(*)`,
      totalCodes: sql<number>`(SELECT count(*) FROM ${productCodes} WHERE ${productCodes.isActive} = true)`,
      lowStockCount: sql<number>`count(*) FILTER (WHERE ${products.stockQuantity} < 10)`,
      pendingCount: sql<number>`count(*) FILTER (WHERE ${products.createdAt} >= NOW() - INTERVAL '24 hours')`,
    })
    .from(products);

  // Get products with filters
  const filteredProducts = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(50);

  const productIds = filteredProducts.map((p) => p.id);

  // Get images
  const imageRows = productIds.length
    ? await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.order))
    : [];

  const imageMap = new Map<number, Array<typeof productImages.$inferSelect>>();
  imageRows.forEach((image) => {
    const current = imageMap.get(image.productId) ?? [];
    current.push(image);
    imageMap.set(image.productId, current);
  });

  // Get codes
  const codeRows = productIds.length
    ? await db
        .select()
        .from(productCodes)
        .where(inArray(productCodes.productId, productIds))
        .orderBy(asc(productCodes.order))
    : [];

  const codeMap = new Map<number, Array<typeof productCodes.$inferSelect>>();
  codeRows.forEach((code) => {
    const current = codeMap.get(code.productId) ?? [];
    current.push(code);
    codeMap.set(code.productId, current);
  });

  const productsWithDetails = filteredProducts.map((product) => {
    const images = imageMap.get(product.id) ?? [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0] ?? null;
    const codes = codeMap.get(product.id) ?? [];

    return {
      ...product,
      codes,
      imageUrl: primaryImage?.imageUrl ?? product.imageUrl,
      category: product.category,
    };
  });

  // Get low stock alerts
  const lowStockProducts = await db
    .select()
    .from(products)
    .where(lt(products.stockQuantity, 10))
    .orderBy(asc(products.stockQuantity))
    .limit(10);

  const lowStockIds = lowStockProducts.map((p) => p.id);

  const lowStockImages = lowStockIds.length
    ? await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, lowStockIds))
        .orderBy(asc(productImages.order))
    : [];

  const lowStockImageMap = new Map<number, Array<typeof productImages.$inferSelect>>();
  lowStockImages.forEach((image) => {
    const current = lowStockImageMap.get(image.productId) ?? [];
    current.push(image);
    lowStockImageMap.set(image.productId, current);
  });

  const lowStockAlerts = lowStockProducts.map((product) => {
    const images = lowStockImageMap.get(product.id) ?? [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0] ?? null;

    return {
      productId: product.id,
      productName: product.name,
      stockQuantity: product.stockQuantity,
      imageUrl: primaryImage?.imageUrl ?? product.imageUrl,
    };
  });

  // Get recent activity
  const recentActivities = await db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(10);

  // Get unique categories
  const allCategories = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(sql`${products.category} IS NOT NULL`)
    .orderBy(products.category);

  return {
    kpis: {
      totalProducts: kpiData.totalProducts ?? 0,
      totalCodes: kpiData.totalCodes ?? 0,
      lowStockCount: kpiData.lowStockCount ?? 0,
      pendingCount: kpiData.pendingCount ?? 0,
    },
    products: productsWithDetails,
    lowStockAlerts,
    activities: recentActivities,
    categories: allCategories.map((c) => c.category).filter((c): c is string => Boolean(c)),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;
  const { kpis, products, lowStockAlerts, activities, categories } = await getDashboardData(params);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your product inventory
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <DashboardKPICard
          value={kpis.totalProducts}
          label="Total Products"
          icon={Package}
          color="blue"
          trend="up"
          trendValue="+12% this month"
          href="/admin"
        />
        <DashboardKPICard
          value={kpis.totalCodes}
          label="Total SKUs/Barcodes"
          icon={BarCode3}
          color="green"
          trend="up"
          trendValue="+8% this week"
        />
        <DashboardKPICard
          value={kpis.lowStockCount}
          label="Low Stock Items"
          icon={AlertTriangle}
          color="orange"
          trend="down"
          trendValue="-3 from yesterday"
        />
        <DashboardKPICard
          value={kpis.pendingCount}
          label="Recently Added"
          icon={TrendingUp}
          color="blue"
          trend="neutral"
          trendValue="Last 24 hours"
        />
      </div>

      {/* Search and Filters */}
      <DashboardSearch
        filters={{
          search: params.search || '',
          category: params.category || '',
          stockStatus: params.stockStatus || 'all',
          sortBy: params.sortBy || 'recent',
        }}
        onFiltersChange={(newFilters) => {
          const url = new URL(window.location.href);
          url.searchParams.set('search', newFilters.search);
          if (newFilters.category) url.searchParams.set('category', newFilters.category);
          else url.searchParams.delete('category');
          if (newFilters.stockStatus !== 'all') url.searchParams.set('stockStatus', newFilters.stockStatus);
          else url.searchParams.delete('stockStatus');
          if (newFilters.sortBy !== 'recent') url.searchParams.set('sortBy', newFilters.sortBy);
          else url.searchParams.delete('sortBy');
          window.location.href = url.toString();
        }}
        categories={categories}
        resultCount={products.length}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Products - Takes 2 columns */}
        <div className="lg:col-span-2">
          <DashboardProductTable products={products} maxDisplay={20} />
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Low Stock Alerts */}
          <LowStockAlerts alerts={lowStockAlerts} maxDisplay={5} />

          {/* Activity Feed */}
          <ActivityFeed activities={activities} maxDisplay={5} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5" />
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/products/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + Add Product
          </a>
          <button className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors">
            + Bulk Import
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors">
            Export Data
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors">
            Scan Barcode
          </button>
        </div>
      </div>
    </div>
  );
}
