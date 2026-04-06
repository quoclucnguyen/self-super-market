import { NextRequest, NextResponse } from 'next/server';

// GET /api-docs/openapi.json - OpenAPI/Swagger specification
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('host') || 'http://localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const fullBaseUrl = `${protocol}://${baseUrl}`;

  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Self Super Market API',
      description: 'REST API for managing products and inventory in Self Super Market',
      version: '1.0.0',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: fullBaseUrl,
        description: 'Current environment',
      },
    ],
    tags: [
      {
        name: 'Products',
        description: 'Product management endpoints',
      },
      {
        name: 'Upload',
        description: 'Image upload endpoints',
      },
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
    ],
    paths: {
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'List all products',
          description: 'Retrieve a paginated list of products with optional search, category and brand filtering',
          parameters: [
            {
              name: 'search',
              in: 'query',
              description: 'Search by name, barcode, or description',
              required: false,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'category',
              in: 'query',
              description: 'Filter by category',
              required: false,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'brand',
              in: 'query',
              description: 'Filter by brand',
              required: false,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number',
              required: false,
              schema: {
                type: 'integer',
                default: 1,
                minimum: 1,
              },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page',
              required: false,
              schema: {
                type: 'integer',
                default: 20,
                minimum: 1,
                maximum: 100,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      products: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Product',
                        },
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Products'],
          summary: 'Create a new product',
          description: 'Create a new product with the provided information',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProductCreate',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Product created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Product',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid input or barcode already exists',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/products/{id}': {
        get: {
          tags: ['Products'],
          summary: 'Get a product by ID',
          description: 'Retrieve a single product by its ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Product ID',
              required: true,
              schema: {
                type: 'integer',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Product',
                  },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ['Products'],
          summary: 'Update a product',
          description: 'Update an existing product with the provided information',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Product ID',
              required: true,
              schema: {
                type: 'integer',
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProductUpdate',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Product updated successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Product',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid input',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
        delete: {
          tags: ['Products'],
          summary: 'Delete a product',
          description: 'Delete a product by its ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Product ID',
              required: true,
              schema: {
                type: 'integer',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Product deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true,
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/products/barcode/{barcode}': {
        get: {
          tags: ['Products'],
          summary: 'Get a product by barcode',
          description: 'Retrieve a single product by its barcode',
          parameters: [
            {
              name: 'barcode',
              in: 'path',
              description: 'Product barcode',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Product',
                  },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/upload': {
        post: {
          tags: ['Upload'],
          summary: 'Upload an image',
          description: 'Upload an image file to Cloudinary',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'Image file (JPEG, PNG, WebP, GIF, max 5MB)',
                    },
                    folder: {
                      type: 'string',
                      description: 'Cloudinary folder name (default: products)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Image uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: {
                        type: 'string',
                        format: 'uri',
                        description: 'Image URL',
                      },
                      public_id: {
                        type: 'string',
                        description: 'Cloudinary public ID',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid file type or size',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Upload failed',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/login': {
        post: {
          tags: ['Auth'],
          summary: 'Admin login',
          description: 'Authenticate as admin',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['password'],
                  properties: {
                    password: {
                      type: 'string',
                      description: 'Admin password',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true,
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Admin logout',
          description: 'Logout admin session',
          responses: {
            '200': {
              description: 'Logout successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true,
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            barcode: {
              type: 'string',
              description: 'Unique barcode',
            },
            sku: {
              type: 'string',
              nullable: true,
              description: 'Internal stock keeping unit',
            },
            categoryId: {
              type: 'integer',
              description: 'Category ID',
            },
            categoryName: {
              type: 'string',
              nullable: true,
              description: 'Category name',
            },
            brandId: {
              type: 'integer',
              nullable: true,
              description: 'Brand ID',
            },
            brandName: {
              type: 'string',
              nullable: true,
              description: 'Brand name',
            },
            price: {
              type: 'string',
              description: 'Price in decimal format',
            },
            unit: {
              type: 'string',
              description: 'Selling unit (e.g., Chai, Lon, Kg)',
            },
            weightVolume: {
              type: 'string',
              nullable: true,
              description: 'Weight or volume (e.g., 330ml, 1.5kg)',
            },
            origin: {
              type: 'string',
              nullable: true,
              description: 'Country of origin / manufacturing location',
            },
            ingredients: {
              type: 'string',
              nullable: true,
              description: 'Ingredients list',
            },
            nutritionalInfo: {
              type: 'string',
              nullable: true,
              description: 'Nutritional information',
            },
            usageInstructions: {
              type: 'string',
              nullable: true,
              description: 'Usage instructions',
            },
            storageInstructions: {
              type: 'string',
              nullable: true,
              description: 'Storage instructions',
            },
            shelfLifeDays: {
              type: 'integer',
              nullable: true,
              description: 'Shelf life in days',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Product description',
            },
            category: {
              type: 'string',
              nullable: true,
              description: 'Product category',
            },
            stockQuantity: {
              type: 'integer',
              description: 'Stock quantity',
            },
            imageUrl: {
              type: 'string',
              nullable: true,
              format: 'uri',
              description: 'Product image URL',
            },
            imagePublicId: {
              type: 'string',
              nullable: true,
              description: 'Cloudinary public ID',
            },
            images: {
              type: 'array',
              description: 'Product images ordered by display order',
              items: {
                $ref: '#/components/schemas/ProductImage',
              },
            },
            isActive: {
              type: 'boolean',
              description: 'Product active status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        ProductCreate: {
          type: 'object',
          required: ['name', 'barcode', 'unit'],
          anyOf: [
            { required: ['categoryId'] },
            { required: ['categoryName'] },
          ],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Product name',
            },
            barcode: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Unique barcode',
            },
            sku: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Internal stock keeping unit',
            },
            categoryId: {
              type: 'integer',
              minimum: 1,
              description: 'Existing category ID',
            },
            categoryName: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              description: 'Category name (used to auto-create if missing)',
            },
            brandId: {
              type: 'integer',
              minimum: 1,
              nullable: true,
              description: 'Existing brand ID',
            },
            brandName: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              description: 'Brand name (used to auto-create if missing)',
            },
            price: {
              type: 'number',
              exclusiveMinimum: 0,
              maximum: 1000000,
              description: 'Product price (optional)',
            },
            unit: {
              type: 'string',
              minLength: 1,
              maxLength: 20,
              description: 'Selling unit (e.g., Chai, Lon, Kg)',
            },
            weightVolume: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Weight or volume (e.g., 330ml, 1.5kg)',
            },
            origin: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Country of origin / manufacturing location',
            },
            ingredients: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Ingredients list',
            },
            nutritionalInfo: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Nutritional information',
            },
            usageInstructions: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Usage instructions',
            },
            storageInstructions: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Storage instructions',
            },
            shelfLifeDays: {
              type: 'integer',
              minimum: 0,
              nullable: true,
              description: 'Shelf life in days',
            },
            description: {
              type: 'string',
              maxLength: 1000,
              nullable: true,
              description: 'Product description',
            },
            category: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              description: 'Product category',
            },
            stockQuantity: {
              type: 'integer',
              minimum: 0,
              description: 'Stock quantity',
            },
            images: {
              type: 'array',
              maxItems: 20,
              items: {
                $ref: '#/components/schemas/ProductImageInput',
              },
              description: 'Multi-image payload',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Product image URL',
            },
            imagePublicId: {
              type: 'string',
              nullable: true,
              description: 'Cloudinary public ID',
            },
            isActive: {
              type: 'boolean',
              description: 'Product active status',
            },
          },
        },
        ProductUpdate: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Product name',
            },
            barcode: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Unique barcode',
            },
            sku: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Internal stock keeping unit',
            },
            categoryId: {
              type: 'integer',
              minimum: 1,
              description: 'Existing category ID',
            },
            categoryName: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              description: 'Category name (used to auto-create if missing)',
            },
            brandId: {
              type: 'integer',
              minimum: 1,
              nullable: true,
              description: 'Existing brand ID',
            },
            brandName: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              description: 'Brand name (used to auto-create if missing)',
            },
            price: {
              type: 'number',
              exclusiveMinimum: 0,
              maximum: 1000000,
              description: 'Product price',
            },
            unit: {
              type: 'string',
              minLength: 1,
              maxLength: 20,
              description: 'Selling unit (e.g., Chai, Lon, Kg)',
            },
            weightVolume: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Weight or volume (e.g., 330ml, 1.5kg)',
            },
            origin: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Country of origin / manufacturing location',
            },
            ingredients: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Ingredients list',
            },
            nutritionalInfo: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Nutritional information',
            },
            usageInstructions: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Usage instructions',
            },
            storageInstructions: {
              type: 'string',
              maxLength: 5000,
              nullable: true,
              description: 'Storage instructions',
            },
            shelfLifeDays: {
              type: 'integer',
              minimum: 0,
              nullable: true,
              description: 'Shelf life in days',
            },
            description: {
              type: 'string',
              maxLength: 1000,
              nullable: true,
              description: 'Product description',
            },
            category: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              description: 'Product category',
            },
            stockQuantity: {
              type: 'integer',
              minimum: 0,
              description: 'Stock quantity',
            },
            images: {
              type: 'array',
              maxItems: 20,
              items: {
                $ref: '#/components/schemas/ProductImageInput',
              },
              description: 'Multi-image payload (replaces existing image set)',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Product image URL',
            },
            imagePublicId: {
              type: 'string',
              nullable: true,
              description: 'Cloudinary public ID',
            },
            isActive: {
              type: 'boolean',
              description: 'Product active status',
            },
          },
        },
        ProductImage: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            productId: {
              type: 'integer',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
            },
            imagePublicId: {
              type: 'string',
            },
            isPrimary: {
              type: 'boolean',
            },
            order: {
              type: 'integer',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ProductImageInput: {
          type: 'object',
          required: ['imageUrl', 'imagePublicId'],
          properties: {
            imageUrl: {
              type: 'string',
              format: 'uri',
            },
            imagePublicId: {
              type: 'string',
            },
            isPrimary: {
              type: 'boolean',
            },
            order: {
              type: 'integer',
              minimum: 0,
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    },
  });
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
