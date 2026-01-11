import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  pgEnum,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Custom type for PostGIS geography (will be integrated with mapbox later)
const geography = customType<{ data: string; driverParam: string }>({
  dataType() {
    return "geography(POINT, 4326)";
  },
});

// Enums
export const itemTypeEnum = pgEnum("item_type", ["lost", "found"]);
export const itemStatusEnum = pgEnum("item_status", [
  "open",
  "matched",
  "resolved",
  "closed",
]);

// Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    verificationCode: varchar("verification_code", { length: 255 }),
    verificationCodeExpires: timestamp("verification_code_expires", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
    createdAtIdx: index("idx_users_created_at").on(table.createdAt),
  })
);

// Items Table
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: itemTypeEnum("type").notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    description: varchar("description", { length: 1000 }).notNull(),
    buildingName: varchar("building_name", { length: 255 }),
    // PostGIS coordinates - keeping placeholder ST_Point(0, 0)::geography for now
    // Default is handled in insert queries using sql template
    coordinates: geography("coordinates").notNull(),
    status: itemStatusEnum("status").default("open").notNull(),
    matchCount: integer("match_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_items_user_id").on(table.userId),
    typeStatusCreatedIdx: index("idx_items_type_status_created").on(
      table.type,
      table.status,
      table.createdAt
    ),
    userIdCreatedIdx: index("idx_items_user_id_created").on(
      table.userId,
      table.createdAt
    ),
    // GIST index for coordinates is handled by PostGIS, not defined here
    // Full-text search index is also handled separately
  })
);

// Item Images Table
export const itemImages = pgTable(
  "item_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 2048 }).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    itemIdIdx: index("idx_item_images_item_id").on(table.itemId),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.id],
  }),
  images: many(itemImages),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(items, {
    fields: [itemImages.itemId],
    references: [items.id],
  }),
}));

// Type exports for use in routes
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemImage = typeof itemImages.$inferSelect;
export type NewItemImage = typeof itemImages.$inferInsert;
export * from './schema/chat'
