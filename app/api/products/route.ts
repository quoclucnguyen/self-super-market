import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';

import { db } from '@/lib/db';
import { products, categories, brands, productImages } from '@/drizzle/schema';
import { productQuerySchema, productSchema } from '@/lib/validations/product';
import {
  buildSearchConditions,
  findOrCreateBrand,
  findOrCreateCategory,
  getDetailedProductById,
  getImagesByProductIds,
  mergePrimaryImage,
  normalizeIncomingImages,
} from './helpers';

// GET /api/products - List products with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const query = productQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    const { search, category, brand, page, limit } = query;
    const offset = (page - 1) * limit;

    const whereClause = buildSearchConditions(search, category, brand);

    const rows = await db
      .select({
        product: products,
        categoryName: categories.name,
        brandName: brands.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    const productIds = rows.map((row) => row.product.id);
    const imagesByProductId = await getImagesByProductIds(productIds);

    const productList = rows.map((row) => {
      const images = imagesByProductId.get(row.product.id) ?? [];
      const merged = mergePrimaryImage(row.product, images);

      return {
        ...merged,
        categoryName: row.categoryName ?? merged.category,
        brandName: row.brandName,
        images,
      };
    });

    return NextResponse.json({
      products: productList,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = productSchema.parse(body);

    const [existingBarcode] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.barcode, validatedData.barcode))
      .limit(1);

    if (existingBarcode) {
      return NextResponse.json(
        { error: 'Product with this barcode already exists' },
        { status: 400 },
      );
    }

    if (validatedData.sku) {
      const [existingSku] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sku, validatedData.sku))
        .limit(1);

      if (existingSku) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 400 },
        );
      }
    }

    const categoryText = validatedData.categoryName ?? validatedData.category;
    const brandText = validatedData.brandName;
    const normalizedImages = normalizeIncomingImages(
      validatedData.images,
      validatedData.imageUrl,
      validatedData.imagePublicId,
    );

    const productId = await db.transaction(async (tx) => {
      let resolvedCategoryId = validatedData.categoryId ?? null;
      let resolvedCategoryName = categoryText ?? null;

      if (!resolvedCategoryId && categoryText) {
        const categoryRecord = await findOrCreateCategory(tx, categoryText);
        if (categoryRecord) {
          resolvedCategoryId = categoryRecord.id;
          resolvedCategoryName = categoryRecord.name;
        }
      }

      if (resolvedCategoryId) {
        const [categoryRecord] = await tx
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.id, resolvedCategoryId))
          .limit(1);

        if (!categoryRecord) {
          throw new Error('CATEGORY_INVALID');
        }

        resolvedCategoryName = categoryRecord.name;
      }

      if (!resolvedCategoryId) {
        throw new Error('CATEGORY_REQUIRED');
      }

      let resolvedBrandId = validatedData.brandId ?? null;

      if (!resolvedBrandId && brandText) {
        const brandRecord = await findOrCreateBrand(tx, brandText);
        if (brandRecord) {
          resolvedBrandId = brandRecord.id;
        }
      }

      const primaryImage =
        normalizedImages.find((image) => image.isPrimary) ?? normalizedImages[0] ?? null;

      const insertPayload = {
        name: validatedData.name,
        barcode: validatedData.barcode,
        sku: validatedData.sku ?? null,
        categoryId: resolvedCategoryId,
        brandId: resolvedBrandId,
        price: (validatedData.price ?? 0).toString(),
        unit: validatedData.unit,
        weightVolume: validatedData.weightVolume ?? null,
        origin: validatedData.origin ?? null,
        ingredients: validatedData.ingredients ?? null,
        nutritionalInfo: validatedData.nutritionalInfo ?? null,
        usageInstructions: validatedData.usageInstructions ?? null,
        storageInstructions: validatedData.storageInstructions ?? null,
        shelfLifeDays: validatedData.shelfLifeDays ?? null,
        description: validatedData.description ?? null,
        category: resolvedCategoryName,
        stockQuantity: validatedData.stockQuantity ?? 0,
        imageUrl: primaryImage?.imageUrl ?? null,
        imagePublicId: primaryImage?.imagePublicId ?? null,
        isActive: validatedData.isActive ?? true,
        updatedAt: new Date(),
      };

      const [createdProduct] = await tx
        .insert(products)
        .values(insertPayload)
        .returning({ id: products.id });

      if (normalizedImages.length > 0) {
        await tx.insert(productImages).values(
          normalizedImages.map((image, index) => ({
            productId: createdProduct.id,
            imageUrl: image.imageUrl,
            imagePublicId: image.imagePublicId,
            isPrimary: image.isPrimary,
            order: index,
          })),
        );
      }

      return createdProduct.id;
    });

    const product = await getDetailedProductById(productId);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof Error && error.message === 'CATEGORY_REQUIRED') {
      return NextResponse.json(
        { error: 'Category is required. Please provide categoryId or categoryName.' },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === 'CATEGORY_INVALID') {
      return NextResponse.json(
        { error: 'Category does not exist. Please provide a valid category.' },
        { status: 400 },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
