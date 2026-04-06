import { NextRequest, NextResponse } from 'next/server';
import { getDetailedProductByBarcode } from '../../helpers';

// GET /api/products/barcode/[barcode] - Lookup product by barcode
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  try {
    const { barcode } = await params;

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    const product = await getDetailedProductByBarcode(barcode);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error looking up product by barcode:', error);
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    );
  }
}
