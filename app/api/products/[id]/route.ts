import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { ZodError } from 'zod';

import { db } from '@/lib/db';
import { deleteImage } from '@/lib/cloudinary';
import { categories, productCodes, productImages, products } from '@/drizzle/schema';
import { productUpdateSchema } from '@/lib/validations/product';
import {
  findOrCreateBrand,
  findOrCreateCategory,
  getDetailedProductById,
  logActivity,
  normalizeIncomingCodes,
  normalizeIncomingImages,
} from '../helpers';

function parseProductId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

// GET /api/products/[id] - Get product by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseProductId(idParam);

    if (!id) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await getDetailedProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseProductId(idParam);

    if (!id) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = productUpdateSchema.parse(body);

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const categoryText = validatedData.categoryName ?? validatedData.category;
    const brandText = validatedData.brandName;

    const hasIncomingImages =
      validatedData.images !== undefined ||
      validatedData.imageUrl !== undefined ||
      validatedData.imagePublicId !== undefined;

    const normalizedImages = normalizeIncomingImages(
      validatedData.images,
      validatedData.imageUrl,
      validatedData.imagePublicId,
    );

    const hasIncomingCodes = validatedData.codes !== undefined;
    const normalizedCodes = normalizeIncomingCodes(validatedData.codes);

    const existingImageRows = hasIncomingImages
      ? await db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, id))
      : [];

    const oldPublicIds = new Set(
      [...existingImageRows.map((image) => image.imagePublicId), existing.imagePublicId]
        .filter((value): value is string => Boolean(value)),
    );

    const newPublicIds = new Set(normalizedImages.map((image) => image.imagePublicId));
    const imagesToDelete = hasIncomingImages
      ? [...oldPublicIds].filter((publicId) => !newPublicIds.has(publicId))
      : [];

    await db.transaction(async (tx) => {
      let resolvedCategoryId = validatedData.categoryId ?? existing.categoryId;
      let resolvedCategoryName = categoryText ?? existing.category;

      if (!resolvedCategoryId) {
        throw new Error('CATEGORY_REQUIRED');
      }

      if ((validatedData.categoryId !== undefined || categoryText !== undefined) && categoryText) {
        const categoryRecord = await findOrCreateCategory(tx, categoryText);
        if (categoryRecord) {
          resolvedCategoryId = categoryRecord.id;
          resolvedCategoryName = categoryRecord.name;
        }
      } else {
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

      let resolvedBrandId = validatedData.brandId ?? existing.brandId;
      if ((validatedData.brandId !== undefined || brandText !== undefined) && brandText) {
        const brandRecord = await findOrCreateBrand(tx, brandText);
        if (brandRecord) {
          resolvedBrandId = brandRecord.id;
        }
      }

      const updatePayload = {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.price !== undefined && { price: validatedData.price.toString() }),
        ...(validatedData.unit !== undefined && { unit: validatedData.unit }),
        ...(validatedData.weightVolume !== undefined && {
          weightVolume: validatedData.weightVolume ?? null,
        }),
        ...(validatedData.origin !== undefined && { origin: validatedData.origin ?? null }),
        ...(validatedData.ingredients !== undefined && {
          ingredients: validatedData.ingredients ?? null,
        }),
        ...(validatedData.nutritionalInfo !== undefined && {
          nutritionalInfo: validatedData.nutritionalInfo ?? null,
        }),
        ...(validatedData.usageInstructions !== undefined && {
          usageInstructions: validatedData.usageInstructions ?? null,
        }),
        ...(validatedData.storageInstructions !== undefined && {
          storageInstructions: validatedData.storageInstructions ?? null,
        }),
        ...(validatedData.shelfLifeDays !== undefined && {
          shelfLifeDays: validatedData.shelfLifeDays ?? null,
        }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description ?? null,
        }),
        ...(validatedData.stockQuantity !== undefined && {
          stockQuantity: validatedData.stockQuantity,
        }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(validatedData.categoryId !== undefined || categoryText !== undefined
          ? {
              categoryId: resolvedCategoryId,
              category: resolvedCategoryName,
            }
          : {}),
        ...(validatedData.brandId !== undefined || brandText !== undefined
          ? {
              brandId: resolvedBrandId,
            }
          : {}),
        ...(hasIncomingImages
          ? {
              imageUrl: normalizedImages.find((image) => image.isPrimary)?.imageUrl ?? normalizedImages[0]?.imageUrl ?? null,
              imagePublicId:
                normalizedImages.find((image) => image.isPrimary)?.imagePublicId ??
                normalizedImages[0]?.imagePublicId ??
                null,
            }
          : {}),
        updatedAt: new Date(),
      };

      await tx.update(products).set(updatePayload).where(eq(products.id, id));

      if (hasIncomingImages) {
        await tx.delete(productImages).where(eq(productImages.productId, id));

        if (normalizedImages.length > 0) {
          await tx.insert(productImages).values(
            normalizedImages.map((image, index) => ({
              productId: id,
              imageUrl: image.imageUrl,
              imagePublicId: image.imagePublicId,
              isPrimary: image.isPrimary ?? index === 0,
              order: index,
            })),
          );
        }
      }

      if (hasIncomingCodes) {
        await tx.delete(productCodes).where(eq(productCodes.productId, id));

        if (normalizedCodes.length > 0) {
          await tx.insert(productCodes).values(
            normalizedCodes.map((code) => ({
              productId: id,
              code: code.code,
              codeType: code.codeType,
              isPrimary: code.isPrimary,
              isActive: code.isActive,
              order: code.order,
            })),
          );
        }
      }
    });

    if (imagesToDelete.length > 0) {
      await Promise.allSettled(imagesToDelete.map((publicId) => deleteImage(publicId)));
    }

    // Log activity (track what was changed)
    const changedFields: string[] = [];
    if (validatedData.name) changedFields.push('name');
    if (hasIncomingImages) changedFields.push('images');
    if (hasIncomingCodes) changedFields.push('codes');
    if (Object.keys(validatedData).some(k => k.startsWith('price') || k === 'stockQuantity')) {
      changedFields.push('details');
    }

    await logActivity(
      'product',
      id,
      'product_updated',
      'Admin',
      changedFields.length > 0 ? JSON.stringify({ changedFields }) : undefined,
    );

    const updated = await getDetailedProductById(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.flatten() },
        { status: 400 },
      );
    }

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

    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseProductId(idParam);

    if (!id) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const existingImageRows = await db
      .select({ imagePublicId: productImages.imagePublicId })
      .from(productImages)
      .where(eq(productImages.productId, id));

    await db.delete(products).where(eq(products.id, id));

    // Log activity before deleting
    await logActivity(
      'product',
      id,
      'product_deleted',
      'Admin',
      JSON.stringify({ name: existing.name }),
    );

    const imagePublicIds = new Set(
      [...existingImageRows.map((row) => row.imagePublicId), existing.imagePublicId]
        .filter((value): value is string => Boolean(value)),
    );

    if (imagePublicIds.size > 0) {
      await Promise.allSettled([...imagePublicIds].map((publicId) => deleteImage(publicId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
