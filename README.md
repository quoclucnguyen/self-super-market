# Supermarket Product Management System

A product inventory management system built with Next.js, NeonDB, and Cloudinary. Features include product CRUD operations, barcode lookup API, and an admin interface.

## Tech Stack

- **Frontend**: Next.js 16.2.2 (App Router), React 19, Tailwind CSS v4
- **Backend**: Next.js API Routes, Server Actions
- **Database**: NeonDB (PostgreSQL) with Drizzle ORM
- **Image Storage**: Cloudinary
- **Validation**: Zod + React Hook Form
- **Authentication**: HTTP Basic Auth for admin routes

## Features

- ✅ Product inventory management (Create, Read, Update, Delete)
- ✅ Barcode-based product lookup API
- ✅ Image upload to Cloudinary with automatic optimization
- ✅ Admin interface with search and filtering
- ✅ Category-based organization
- ✅ Stock quantity tracking
- ✅ Responsive design (mobile-friendly)

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- A NeonDB account (free at [neon.tech](https://neon.tech))
- A Cloudinary account (free at [cloudinary.com](https://cloudinary.com))

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Database - Get from Neon Console
DATABASE_URL="postgresql://<user>:<password>@<endpoint>.neon.tech:<port>/<dbname>?sslmode=require"

# Cloudinary - Get from Cloudinary Dashboard
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Admin Authentication
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-secure-password"
```

### 4. Setup Database

Generate and run migrations:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/admin` and use your configured credentials.

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (pagination, search) |
| POST | `/api/products` | Create new product |
| GET | `/api/products/[id]` | Get product by ID |
| PUT | `/api/products/[id]` | Update product |
| DELETE | `/api/products/[id]` | Delete product |
| GET | `/api/products/barcode/[barcode]` | Lookup by barcode |

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload image to Cloudinary |

### Example API Usage

**Lookup product by barcode:**
```bash
curl http://localhost:3000/api/products/barcode/1234567890123
```

**Create product:**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "barcode": "1234567890123",
    "price": 9.99,
    "category": "Beverages",
    "stockQuantity": 100
  }'
```

## Admin Interface

- **Dashboard**: `/admin` - View and manage all products
- **Create Product**: `/admin/products/new`
- **Edit Product**: `/admin/products/[id]`
- **Delete Product**: `/admin/products/[id]/delete`

The admin interface is protected by HTTP Basic Authentication.

## Project Structure

```
├── app/
│   ├── admin/              # Admin pages
│   │   ├── layout.tsx      # Admin layout with navigation
│   │   ├── page.tsx        # Dashboard
│   │   └── products/       # Product management pages
│   ├── api/                # API routes
│   │   ├── products/       # Product CRUD endpoints
│   │   └── upload/         # Image upload
│   └── layout.tsx          # Root layout
├── components/
│   └── admin/              # Admin components
│       ├── ProductForm.tsx
│       ├── ProductList.tsx
│       ├── ImageUpload.tsx
│       └── SearchBar.tsx
├── drizzle/
│   ├── schema.ts           # Database schema
│   └── migrations/         # SQL migrations
├── lib/
│   ├── db.ts               # Database connection
│   ├── cloudinary.ts       # Cloudinary helpers
│   └── validations/        # Zod schemas
└── middleware.ts           # Basic auth middleware
```

## Database Schema

**Products Table:**
- `id` - Primary key
- `name` - Product name
- `barcode` - Unique barcode (indexed)
- `price` - Product price
- `description` - Product description
- `category` - Product category (indexed)
- `stockQuantity` - Available stock
- `imageUrl` - Cloudinary image URL
- `imagePublicId` - Cloudinary public ID for deletion
- `isActive` - Active status
- `createdAt`, `updatedAt` - Timestamps

## Development

### Generate Migrations

```bash
npx drizzle-kit generate
```

### Run Migrations

```bash
npx drizzle-kit migrate
```

### Open Drizzle Studio (Database GUI)

```bash
npx drizzle-kit studio
```

### Type Safety

The project uses TypeScript throughout. Types are auto-generated from:
- Drizzle schema (database types)
- Zod schemas (validation types)

## Deployment

1. Set environment variables in your hosting platform
2. Run migrations: `npx drizzle-kit migrate`
3. Build: `npm run build`
4. Start: `npm start`

## License

MIT
