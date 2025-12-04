# Database Documentation

LostLink uses **PostgreSQL 17** hosted on **Neon** (serverless PostgreSQL) with **Drizzle ORM** for type-safe database queries.

---

## Overview

The database migration from MongoDB to PostgreSQL was completed to better support the relational nature of the data model. See `docs/ADR/ADR_002.MD` for detailed reasoning behind this decision.

**Database Provider:** Neon (serverless PostgreSQL)  
**ORM:** Drizzle ORM with `drizzle-orm/node-postgres`  
**Connection:** Standard PostgreSQL connection string via `POSTGRESQL_URI` environment variable

---

## Database Schema

### Tables

#### `users`

User accounts with email verification.

- **Primary Key:** `id` (UUID)
- **Unique:** `email` (must be @stud.h-da.de)
- **Features:** Email verification with 6-digit codes, password hashing

#### `items`

Lost/found items with geospatial data.

- **Primary Key:** `id` (UUID)
- **Foreign Key:** `user_id` → `users.id` (CASCADE delete)
- **Features:**
  - PostGIS geography for coordinates
  - Full-text search on title + description
  - Status tracking (open, matched, resolved, closed)
  - Type (lost, found)

#### `item_images`

Item images stored in MinIO (S3-compatible).

- **Primary Key:** `id` (UUID)
- **Foreign Key:** `item_id` → `items.id` (CASCADE delete)
- **Features:** Stores MinIO URLs and filenames

#### `item_tags`

Tags for item categorization and search.

- **Primary Key:** `id` (UUID)
- **Foreign Key:** `item_id` → `items.id` (CASCADE delete)
- **Features:** Many-to-many relationship between items and tags

### Relationships

- **Users → Items:** One-to-many (a user can have multiple items)
- **Items → Item Images:** One-to-many (an item can have multiple images)
- **Items → Item Tags:** One-to-many (an item can have multiple tags)

---

## Key Features

### Primary Keys

- All tables use UUID primary keys generated via `uuid_generate_v4()`
- Ensures globally unique identifiers across distributed systems

### Foreign Key Constraints

- All foreign keys have `ON DELETE CASCADE` to maintain referential integrity
- Prevents orphaned records when parent records are deleted

### Indexes

#### GIN Indexes

- **Full-text search:** `idx_items_fulltext` on `items(title, description)`
  - Uses `to_tsvector('english', title || ' ' || description)`
  - Enables fast text search queries

#### GIST Indexes

- **Geospatial queries:** `idx_items_coordinates` on `items.coordinates`
  - PostGIS GIST index for efficient spatial queries
  - Supports distance calculations and proximity searches

#### B-Tree Indexes

- `idx_users_email`: Unique index on user emails
- `idx_items_user_id`: Foreign key index for user lookups
- `idx_items_type_status_created`: Composite index for common filtering
- `idx_items_user_id_created`: Composite index for user's items queries
- `idx_item_images_item_id`: Foreign key index
- `idx_item_tags_item_id`: Foreign key index
- `idx_item_tags_tag`: Index for tag-based searches

### Automatic Timestamps

- **Triggers:** Automatic `updated_at` timestamp updates via database triggers
- **Function:** `update_updated_at_column()` updates timestamps on row updates
- Applied to: `users`, `items` tables

---

## Database Extensions

### uuid-ossp

- **Purpose:** UUID generation
- **Usage:** `uuid_generate_v4()` for primary key defaults
- **Status:** Enabled in database

### postgis

- **Purpose:** Geospatial data types and functions
- **Usage:**
  - `GEOGRAPHY(POINT, 4326)` type for coordinates
  - Spatial functions: `ST_Point`, `ST_Distance`, etc.
  - GIST indexes for spatial queries
- **Status:** Enabled in database
- **Note:** Currently using placeholder coordinates (ST_Point(0, 0)) until map integration

---

## Schema Management

### Drizzle ORM

**Schema Definition:** `backend/src/db/schema.ts`

- All tables, columns, and relationships defined in TypeScript
- Automatic type inference for queries
- Relations defined for efficient data fetching

**Configuration:** `backend/drizzle.config.ts`

- Drizzle Kit configuration for migrations and introspection
- Points to schema file and database connection

### Migrations

**Current Status:** Schema already exists in database (migrated from MongoDB)

**Future Migrations:**

- Use Drizzle Kit to generate migrations: `npx drizzle-kit generate`
- Apply migrations: `npx drizzle-kit migrate`

**Note:** Some indexes (GIN for full-text search, GIST for geospatial) are created separately as they require raw SQL expressions that Drizzle doesn't support natively.

### Connection

**Driver:** Standard `pg` (node-postgres) Pool  
**Connection String:** `POSTGRESQL_URI` environment variable  
**Compatibility:** Works with Neon connection strings (standard PostgreSQL protocol)

---

## Query Patterns

### Full-Text Search

```typescript
// Search items by title and description
sql`to_tsvector('english', ${items.title} || ' ' || ${items.description}) 
    @@ plainto_tsquery('english', ${search})`;
```

Uses the GIN index `idx_items_fulltext` for fast text search.

### Geospatial Queries

```sql
-- Example: Find items within radius (future implementation)
SELECT * FROM items
WHERE ST_DWithin(
  coordinates,
  ST_Point(longitude, latitude)::geography,
  radius_in_meters
);
```

Uses the GIST index `idx_items_coordinates` for efficient spatial queries.

### Relational Queries

Drizzle ORM relations eliminate N+1 queries:

```typescript
// Fetch items with images and tags in optimized queries
const items = await db.query.items.findMany({
  with: {
    images: true,
    tags: true,
    user: true,
  },
});
```

---

## Environment Setup

### Required Environment Variable

```bash
POSTGRESQL_URI=postgresql://user:password@host/database?sslmode=require
```

Get your connection string from your Neon dashboard.

### Local Development

The database is hosted on Neon (cloud), so no local PostgreSQL installation is needed. Just set the `POSTGRESQL_URI` in your `.env` file.

---

## Database Diagram

See `docs/Uploads/UML_04-12-2025.png` for a visual Entity-Relationship Diagram of the database schema.

---

## Related Documentation

- **Migration Decision:** `docs/ADR/ADR_002.MD` - MongoDB to PostgreSQL migration
- **API Documentation:** `docs/API_DOCS.md` - API endpoints using the database
- **Schema Source:** `backend/src/db/schema.ts` - Drizzle schema definitions
