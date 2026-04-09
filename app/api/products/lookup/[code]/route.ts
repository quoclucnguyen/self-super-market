import { NextRequest, NextResponse } from 'next/server';
import { getDetailedProductByCode } from '../../helpers';

// GET /api/products/lookup/[code] - Lookup product by any code (barcode or SKU)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    const product = await getDetailedProductByCode(code);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error looking up product by code:', error);
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    );
  }
}
