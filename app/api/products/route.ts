import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/drizzle/schema';
import { productSchema, productQuerySchema } from '@/lib/validations/product';
import { eq, like, or, desc, and, sql } from 'drizzle-orm';
import { deleteImage } from '@/lib/cloudinary';

// GET /api/products - List products with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = productQuerySchema.parse(Object.fromEntries(searchParams));

    const { search, category, page, limit } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
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
      conditions.push(eq(products.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    // Get products
    const productList = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

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
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Check if barcode already exists
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.barcode, validatedData.barcode))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Product with this barcode already exists' },
        { status: 400 }
      );
    }

    const [newProduct] = await db
      .insert(products)
      .values({
        name: validatedData.name,
        barcode: validatedData.barcode,
        price: validatedData.price.toString(),
        description: validatedData.description,
        category: validatedData.category,
        stockQuantity: validatedData.stockQuantity,
        imageUrl: validatedData.imageUrl,
        imagePublicId: validatedData.imagePublicId,
      })
      .returning();

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

