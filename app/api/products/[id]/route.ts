import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/drizzle/schema';
import { productUpdateSchema } from '@/lib/validations/product';
import { eq } from 'drizzle-orm';
import { deleteImage } from '@/lib/cloudinary';

// GET /api/products/[id] - Get product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = productUpdateSchema.parse(body);

    // Check if product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if new barcode conflicts with another product
    if (validatedData.barcode && validatedData.barcode !== existing.barcode) {
      const [conflict] = await db
        .select()
        .from(products)
        .where(eq(products.barcode, validatedData.barcode))
        .limit(1);

      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: 'Product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    // Delete old image if replacing
    if (validatedData.imageUrl && existing.imagePublicId &&
        validatedData.imagePublicId !== existing.imagePublicId) {
      await deleteImage(existing.imagePublicId);
    }

    // Update product
    const updateData: Partial<{
      name: string;
      barcode: string;
      price: string;
      description: string | null;
      category: string | null;
      stockQuantity: number;
      imageUrl: string | null;
      imagePublicId: string | null;
      updatedAt: Date;
    }> = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.barcode && { barcode: validatedData.barcode }),
      ...(validatedData.price !== undefined && { price: validatedData.price.toString() }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
      ...(validatedData.category !== undefined && { category: validatedData.category }),
      ...(validatedData.stockQuantity !== undefined && { stockQuantity: validatedData.stockQuantity }),
      ...(validatedData.imageUrl !== undefined && { imageUrl: validatedData.imageUrl }),
      ...(validatedData.imagePublicId !== undefined && { imagePublicId: validatedData.imagePublicId }),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Get product to delete its image
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete image from Cloudinary
    if (existing.imagePublicId) {
      try {
        await deleteImage(existing.imagePublicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Continue with product deletion even if image deletion fails
      }
    }

    // Delete product from database
    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}