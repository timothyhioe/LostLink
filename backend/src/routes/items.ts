import { Router } from "express";
import { uploadSingle } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { storageService } from "../services/storage.service";
import { logger } from "../utils/logger";
import { db } from "../config/database";
import { items, itemImages, itemTags, users } from "../db/schema";
import { sql, eq, and, desc, count, or, like, inArray } from "drizzle-orm";
import { minioClient } from "../config/minio";
import { env } from "../config/env";

const router = Router();

/**
 * @swagger
 * /items:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *               - buildingName
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [lost, found]
 *               buildingName:
 *                 type: string
 *                 description: Required for 'found' items, optional for 'lost' items
 *                 example: D14
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags (e.g. "bottle,black,insulated")
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image of the item
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Item created successfully
 *                 item:
 *                   $ref: '#/components/schemas/Item'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", authenticate, uploadSingle, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { title, description, type, buildingName, tags } = req.body;

    //validate required fields
    if (!title || !description || !type) {
      return res.status(400).json({
        message: "Missing required fields: title, description, type",
      });
    }

    //validate item type
    if (!["lost", "found"].includes(type)) {
      return res.status(400).json({
        message: "Type must be either 'lost' or 'found'",
      });
    }

    //for FOUND items, location is required
    if (type === "found" && !buildingName) {
      return res.status(400).json({
        message: "Location (buildingName) is required for found items",
      });
    }

    // Parse tags (comma-separated string to array)
    const tagArray = tags
      ? tags.split(",").map((tag: string) => tag.trim().toLowerCase())
      : [];

    // Handle image upload first (before transaction)
    let uploadResult = null;
    if (req.file) {
      uploadResult = await storageService.uploadFile(req.file, "items");
      logger.info("Image uploaded for item", {
        filename: uploadResult.filename,
      });
    }

    // Use transaction for item, image, and tags
    const result = await db.transaction(async (tx) => {
      // Insert item with PostGIS placeholder
      const [item] = await tx
        .insert(items)
        .values({
          userId,
          type: type as "lost" | "found",
          title,
          description,
          buildingName: buildingName || "Location not specified", // Keep it optional for 'found' items
          coordinates: sql`ST_Point(0, 0)::geography`,
          status: "open",
          matchCount: 0,
        })
        .returning();

      if (!item) {
        throw new Error("Failed to create item");
      }

      // Insert image if uploaded
      if (uploadResult) {
        await tx.insert(itemImages).values({
          itemId: item.id,
          url: uploadResult.url,
          filename: uploadResult.filename,
        });
      }

      // Insert tags
      if (tagArray.length > 0) {
        await tx.insert(itemTags).values(
          tagArray.map((tag: string) => ({
            itemId: item.id,
            tag,
          }))
        );
      }

      return item;
    });

    logger.info("Item created", { itemId: result.id, userId });

    res.status(201).json({
      message: "Item created successfully",
      item: {
        id: result.id,
        userId: result.userId,
        type: result.type,
        title: result.title,
        description: result.description,
        buildingName: result.buildingName,
        status: result.status,
        matchCount: result.matchCount,
        tags: tagArray,
        images: uploadResult
          ? [
              {
                url: uploadResult.url,
                filename: uploadResult.filename,
                uploadedAt: new Date(),
              },
            ]
          : [],
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Failed to create item", { error });
    next(error);
  }
});

/**
 * @swagger
 * /items:
 *   get:
 *     summary: Get all items with optional filters
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lost, found]
 *         description: Filter by item type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, matched, resolved, closed]
 *         description: Filter by item status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search in title and description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of items with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of items
 *                     page:
 *                       type: integer
 *                       description: Current page
 *                     limit:
 *                       type: integer
 *                       description: Items per page
 *                     pages:
 *                       type: integer
 *                       description: Total pages
 */
router.get("/", async (req, res, next) => {
  try {
    const { type, status, search, limit = "20", page = "1" } = req.query;

    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions = [];
    if (type && typeof type === "string") {
      conditions.push(eq(items.type, type as "lost" | "found"));
    }
    if (status && typeof status === "string") {
      conditions.push(
        eq(items.status, status as "open" | "matched" | "resolved" | "closed")
      );
    }
    if (search && typeof search === "string") {
      conditions.push(
        sql`to_tsvector('english', ${items.title} || ' ' || ${items.description}) @@ plainto_tsquery('english', ${search})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get items with user info using relations
    const itemsResult = await db
      .select({
        id: items.id,
        userId: items.userId,
        type: items.type,
        title: items.title,
        description: items.description,
        buildingName: items.buildingName,
        status: items.status,
        matchCount: items.matchCount,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(items)
      .leftJoin(users, eq(items.userId, users.id))
      .where(whereClause)
      .orderBy(desc(items.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(items)
      .where(whereClause);

    const total = countResult?.total || 0;

    // Get all tags and images for items in one query each (eliminate N+1)
    const itemIds = itemsResult.map((item) => item.id);

    const allTags =
      itemIds.length > 0
        ? await db
            .select({
              itemId: itemTags.itemId,
              tag: itemTags.tag,
            })
            .from(itemTags)
            .where(inArray(itemTags.itemId, itemIds))
        : [];

    const allImages =
      itemIds.length > 0
        ? await db
            .select({
              itemId: itemImages.itemId,
              url: itemImages.url,
              filename: itemImages.filename,
              uploadedAt: itemImages.uploadedAt,
            })
            .from(itemImages)
            .where(inArray(itemImages.itemId, itemIds))
        : [];

    // Group tags and images by itemId
    const tagsByItem = new Map<string, string[]>();
    const imagesByItem = new Map<string, typeof allImages>();

    for (const tag of allTags) {
      const existing = tagsByItem.get(tag.itemId) || [];
      existing.push(tag.tag);
      tagsByItem.set(tag.itemId, existing);
    }

    for (const image of allImages) {
      const existing = imagesByItem.get(image.itemId) || [];
      existing.push(image);
      imagesByItem.set(image.itemId, existing);
    }

    // Map results with tags and images
    const mappedItems = itemsResult.map((item) => ({
      id: item.id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      description: item.description,
      buildingName: item.buildingName,
      status: item.status,
      matchCount: item.matchCount,
      tags: tagsByItem.get(item.id) || [],
      images: imagesByItem.get(item.id) || [],
      user: {
        name: item.userName,
        email: item.userEmail,
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.json({
      items: mappedItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch items", { error });
    next(error);
  }
});

/**
 * @swagger
 * /items/my:
 *   get:
 *     summary: Get current user's items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/my", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const itemsResult = await db
      .select()
      .from(items)
      .where(eq(items.userId, userId))
      .orderBy(desc(items.createdAt));

    // Get all tags and images for items in one query each (eliminate N+1)
    const itemIds = itemsResult.map((item) => item.id);

    const allTags =
      itemIds.length > 0
        ? await db
            .select({
              itemId: itemTags.itemId,
              tag: itemTags.tag,
            })
            .from(itemTags)
            .where(inArray(itemTags.itemId, itemIds))
        : [];

    const allImages =
      itemIds.length > 0
        ? await db
            .select({
              itemId: itemImages.itemId,
              url: itemImages.url,
              filename: itemImages.filename,
              uploadedAt: itemImages.uploadedAt,
            })
            .from(itemImages)
            .where(inArray(itemImages.itemId, itemIds))
        : [];

    // Group tags and images by itemId
    const tagsByItem = new Map<string, string[]>();
    const imagesByItem = new Map<string, typeof allImages>();

    for (const tag of allTags) {
      const existing = tagsByItem.get(tag.itemId) || [];
      existing.push(tag.tag);
      tagsByItem.set(tag.itemId, existing);
    }

    for (const image of allImages) {
      const existing = imagesByItem.get(image.itemId) || [];
      existing.push(image);
      imagesByItem.set(image.itemId, existing);
    }

    // Map results with tags and images
    const mappedItems = itemsResult.map((item) => ({
      id: item.id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      description: item.description,
      buildingName: item.buildingName,
      status: item.status,
      matchCount: item.matchCount,
      tags: tagsByItem.get(item.id) || [],
      images: imagesByItem.get(item.id) || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.json({ items: mappedItems });
  } catch (error) {
    logger.error("Failed to fetch user items", { error });
    next(error);
  }
});

/**
 * @swagger
 * /items/images/{filename}:
 *   get:
 *     summary: Get an image file
 *     description: |
 *       Returns an image file from MinIO storage.
 *
 *       **Note:** Swagger UI cannot display binary image responses.
 *       To view the image, copy the Request URL and open it in your browser.
 *
 *       Example: `http://localhost:5000/api/items/images/123-photo.jpg`
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Image filename (e.g., 123-photo.jpg)
 *         example: 1764278980657-ForestWaterBottle_16oz_Square_Black_703b29c6-5070-4268-88a2-6be7747c89e5.jpg
 *     responses:
 *       200:
 *         description: Image file (JPEG, PNG, GIF, or WebP). Copy the Request URL to view in browser.
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/gif:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/images/:filename", async (req, res, next) => {
  try {
    const { filename } = req.params;
    const fullPath = `items/${filename}`;

    // Check if file exists
    try {
      await minioClient.statObject(env.MINIO_BUCKET, fullPath);
    } catch (error) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Get the file stream from MinIO
    const dataStream = await minioClient.getObject(env.MINIO_BUCKET, fullPath);

    // Detect content type from filename
    const contentType = filename.toLowerCase().endsWith(".png")
      ? "image/png"
      : filename.toLowerCase().endsWith(".gif")
      ? "image/gif"
      : filename.toLowerCase().endsWith(".webp")
      ? "image/webp"
      : "image/jpeg"; // default to jpeg

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    // Stream the file to the response
    dataStream.pipe(res);
  } catch (error) {
    logger.error("Failed to serve image", {
      error,
      filename: req.params.filename,
    });
    next(error);
  }
});

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get a single item by ID
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const [item] = await db
      .select({
        id: items.id,
        userId: items.userId,
        type: items.type,
        title: items.title,
        description: items.description,
        buildingName: items.buildingName,
        status: items.status,
        matchCount: items.matchCount,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(items)
      .leftJoin(users, eq(items.userId, users.id))
      .where(eq(items.id, id as string))
      .limit(1);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Get tags and images
    const tagsResult = await db
      .select({ tag: itemTags.tag })
      .from(itemTags)
      .where(eq(itemTags.itemId, id as string));

    const imagesResult = await db
      .select({
        url: itemImages.url,
        filename: itemImages.filename,
        uploadedAt: itemImages.uploadedAt,
      })
      .from(itemImages)
      .where(eq(itemImages.itemId, id as string));

    res.json({
      item: {
        id: item.id,
        userId: item.userId,
        type: item.type,
        title: item.title,
        description: item.description,
        buildingName: item.buildingName,
        status: item.status,
        matchCount: item.matchCount,
        tags: tagsResult.map((r) => r.tag),
        images: imagesResult,
        user: {
          name: item.userName,
          email: item.userEmail,
        },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch item", { error });
    next(error);
  }
});

/**
 * @swagger
 * /items/{id}:
 *   patch:
 *     summary: Update an item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               buildingName:
 *                 type: string
 *               tags:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [open, matched, resolved, closed]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 item:
 *                   $ref: '#/components/schemas/Item'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not the item owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/:id", authenticate, uploadSingle, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Item ID is required" });
    }
    const userId = req.user!.userId;
    const { title, description, buildingName, tags, status } = req.body;

    // Find item
    const [item] = await db
      .select({ id: items.id, userId: items.userId })
      .from(items)
      .where(eq(items.id, id))
      .limit(1);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check ownership
    if (item.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this item" });
    }

    // Handle new image upload first (before transaction)
    let uploadResult = null;
    if (req.file) {
      uploadResult = await storageService.uploadFile(req.file, "items");
      logger.info("New image added to item", { itemId: id });
    }

    // Use transaction for updates
    const updatedItem = await db.transaction(async (tx) => {
      // Build update object
      const updateData: Partial<typeof items.$inferInsert> = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (buildingName) updateData.buildingName = buildingName;
      if (status)
        updateData.status = status as
          | "open"
          | "matched"
          | "resolved"
          | "closed";

      // Update item if there are changes
      if (Object.keys(updateData).length > 0) {
        await tx.update(items).set(updateData).where(eq(items.id, id));
      }

      // Handle new image upload
      if (uploadResult) {
        await tx.insert(itemImages).values({
          itemId: id as string,
          url: uploadResult.url,
          filename: uploadResult.filename,
        });
      }

      // Update tags if provided
      if (tags) {
        // Delete old tags
        await tx.delete(itemTags).where(eq(itemTags.itemId, id as string));

        // Insert new tags
        const tagArray = tags
          .split(",")
          .map((tag: string) => tag.trim().toLowerCase());

        if (tagArray.length > 0) {
          await tx.insert(itemTags).values(
            tagArray.map((tag: string) => ({
              itemId: id as string,
              tag,
            }))
          );
        }
      }

      // Fetch updated item
      const [updated] = await tx
        .select()
        .from(items)
        .where(eq(items.id, id as string))
        .limit(1);

      return updated;
    });

    if (!updatedItem) {
      return res.status(500).json({ message: "Failed to update item" });
    }

    // Get tags and images for response
    const tagsResult = await db
      .select({ tag: itemTags.tag })
      .from(itemTags)
      .where(eq(itemTags.itemId, id as string));

    const imagesResult = await db
      .select({
        url: itemImages.url,
        filename: itemImages.filename,
        uploadedAt: itemImages.uploadedAt,
      })
      .from(itemImages)
      .where(eq(itemImages.itemId, id as string));

    res.json({
      message: "Item updated successfully",
      item: {
        id: updatedItem.id,
        userId: updatedItem.userId,
        type: updatedItem.type,
        title: updatedItem.title,
        description: updatedItem.description,
        buildingName: updatedItem.buildingName,
        status: updatedItem.status,
        matchCount: updatedItem.matchCount,
        tags: tagsResult.map((r) => r.tag),
        images: imagesResult,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Failed to update item", { error });
    next(error);
  }
});

/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: Delete an item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Item deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not the item owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Item ID is required" });
    }
    const userId = req.user!.userId;

    // Find item
    const [item] = await db
      .select({ id: items.id, userId: items.userId })
      .from(items)
      .where(eq(items.id, id as string))
      .limit(1);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check ownership
    if (item.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this item" });
    }

    // Get images before deleting
    const imagesResult = await db
      .select({ filename: itemImages.filename })
      .from(itemImages)
      .where(eq(itemImages.itemId, id as string));

    // Delete images from MinIO
    for (const image of imagesResult) {
      try {
        await storageService.deleteFile(image.filename);
        logger.info("Image deleted from MinIO", { filename: image.filename });
      } catch (error) {
        logger.error("Failed to delete image from MinIO", {
          error,
          filename: image.filename,
        });
      }
    }

    // Delete item (cascade will delete tags and images)
    await db.delete(items).where(eq(items.id, id as string));

    logger.info("Item deleted", { itemId: id, userId });

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    logger.error("Failed to delete item", { error });
    next(error);
  }
});

export { router as itemsRouter };
