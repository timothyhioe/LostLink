import { Router } from "express";
import { uploadSingle } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { storageService } from "../services/storage.service";
import { logger } from "../utils/logger";
import { pool } from "../config/database";
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

    // Insert item into PostgreSQL
    const itemResult = await pool.query(
      `INSERT INTO items (user_id, type, title, description, building_name, coordinates, status, match_count)
       VALUES ($1, $2, $3, $4, $5, ST_Point(0, 0)::geography, 'open', 0)
       RETURNING id, user_id, type, title, description, building_name, status, match_count, created_at, updated_at`,
      [userId, type, title, description, buildingName || "Location not specified"]
    );

    const item = itemResult.rows[0];

    // Handle image upload
    if (req.file) {
      const uploadResult = await storageService.uploadFile(req.file, "items");
      
      // Insert image into database
      await pool.query(
        `INSERT INTO item_images (item_id, url, filename)
         VALUES ($1, $2, $3)`,
        [item.id, uploadResult.url, uploadResult.filename]
      );
      
      logger.info("Image uploaded for item", {
        filename: uploadResult.filename,
      });
    }

    // Insert tags
    for (const tag of tagArray) {
      await pool.query(
        `INSERT INTO item_tags (item_id, tag)
         VALUES ($1, $2)`,
        [item.id, tag]
      );
    }

    logger.info("Item created", { itemId: item.id, userId });

    res.status(201).json({
      message: "Item created successfully",
      item: {
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        description: item.description,
        buildingName: item.building_name,
        status: item.status,
        matchCount: item.match_count,
        tags: tagArray,
        images: [],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
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

    // Build WHERE clause
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search && typeof search === "string") {
      whereClause += ` AND to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(search);
      paramIndex++;
    }

    // Get items
    const itemsResult = await pool.query(
      `SELECT i.id, i.user_id, i.type, i.title, i.description, i.building_name, i.status, i.match_count, i.created_at, i.updated_at,
              u.name, u.email
       FROM items i
       LEFT JOIN users u ON i.user_id = u.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM items i ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total, 10);

    // Get tags for each item
    const items = await Promise.all(
      itemsResult.rows.map(async (item) => {
        const tagsResult = await pool.query(
          `SELECT tag FROM item_tags WHERE item_id = $1`,
          [item.id]
        );
        const imagesResult = await pool.query(
          `SELECT url, filename, uploaded_at FROM item_images WHERE item_id = $1`,
          [item.id]
        );

        return {
          id: item.id,
          userId: item.user_id,
          type: item.type,
          title: item.title,
          description: item.description,
          buildingName: item.building_name,
          status: item.status,
          matchCount: item.match_count,
          tags: tagsResult.rows.map((r) => r.tag),
          images: imagesResult.rows,
          user: {
            name: item.name,
            email: item.email,
          },
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      })
    );

    res.json({
      items,
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

    const itemsResult = await pool.query(
      `SELECT i.id, i.user_id, i.type, i.title, i.description, i.building_name, i.status, i.match_count, i.created_at, i.updated_at
       FROM items i
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    // Get tags and images for each item
    const items = await Promise.all(
      itemsResult.rows.map(async (item) => {
        const tagsResult = await pool.query(
          `SELECT tag FROM item_tags WHERE item_id = $1`,
          [item.id]
        );
        const imagesResult = await pool.query(
          `SELECT url, filename, uploaded_at FROM item_images WHERE item_id = $1`,
          [item.id]
        );

        return {
          id: item.id,
          userId: item.user_id,
          type: item.type,
          title: item.title,
          description: item.description,
          buildingName: item.building_name,
          status: item.status,
          matchCount: item.match_count,
          tags: tagsResult.rows.map((r) => r.tag),
          images: imagesResult.rows,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      })
    );

    res.json({ items });
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

    const itemResult = await pool.query(
      `SELECT i.id, i.user_id, i.type, i.title, i.description, i.building_name, i.status, i.match_count, i.created_at, i.updated_at,
              u.name, u.email
       FROM items i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const item = itemResult.rows[0];

    // Get tags and images
    const tagsResult = await pool.query(
      `SELECT tag FROM item_tags WHERE item_id = $1`,
      [id]
    );
    const imagesResult = await pool.query(
      `SELECT url, filename, uploaded_at FROM item_images WHERE item_id = $1`,
      [id]
    );

    res.json({
      item: {
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        description: item.description,
        buildingName: item.building_name,
        status: item.status,
        matchCount: item.match_count,
        tags: tagsResult.rows.map((r) => r.tag),
        images: imagesResult.rows,
        user: {
          name: item.name,
          email: item.email,
        },
        createdAt: item.created_at,
        updatedAt: item.updated_at,
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
    const userId = req.user!.userId;
    const { title, description, buildingName, tags, status } = req.body;

    // Find item
    const itemResult = await pool.query(
      `SELECT id, user_id FROM items WHERE id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const item = itemResult.rows[0];

    // Check ownership
    if (item.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this item" });
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    if (description) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (buildingName) {
      updates.push(`building_name = $${paramIndex}`);
      params.push(buildingName);
      paramIndex++;
    }
    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Update item
    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      await pool.query(
        `UPDATE items SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
        params
      );
    }

    // Handle new image upload
    if (req.file) {
      const uploadResult = await storageService.uploadFile(req.file, "items");
      await pool.query(
        `INSERT INTO item_images (item_id, url, filename)
         VALUES ($1, $2, $3)`,
        [id, uploadResult.url, uploadResult.filename]
      );
      logger.info("New image added to item", { itemId: id });
    }

    // Update tags
    if (tags) {
      // Delete old tags
      await pool.query(`DELETE FROM item_tags WHERE item_id = $1`, [id]);

      // Insert new tags
      const tagArray = tags
        .split(",")
        .map((tag: string) => tag.trim().toLowerCase());
      for (const tag of tagArray) {
        await pool.query(
          `INSERT INTO item_tags (item_id, tag) VALUES ($1, $2)`,
          [id, tag]
        );
      }
    }

    // Fetch updated item
    const updatedResult = await pool.query(
      `SELECT id, user_id, type, title, description, building_name, status, match_count, created_at, updated_at
       FROM items WHERE id = $1`,
      [id]
    );

    const updatedItem = updatedResult.rows[0];

    res.json({
      message: "Item updated successfully",
      item: {
        id: updatedItem.id,
        userId: updatedItem.user_id,
        type: updatedItem.type,
        title: updatedItem.title,
        description: updatedItem.description,
        buildingName: updatedItem.building_name,
        status: updatedItem.status,
        matchCount: updatedItem.match_count,
        createdAt: updatedItem.created_at,
        updatedAt: updatedItem.updated_at,
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
    const userId = req.user!.userId;

    // Find item
    const itemResult = await pool.query(
      `SELECT id, user_id FROM items WHERE id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const item = itemResult.rows[0];

    // Check ownership
    if (item.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this item" });
    }

    // Get images before deleting
    const imagesResult = await pool.query(
      `SELECT filename FROM item_images WHERE item_id = $1`,
      [id]
    );

    // Delete images from MinIO
    for (const image of imagesResult.rows) {
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
    await pool.query(`DELETE FROM items WHERE id = $1`, [id]);

    logger.info("Item deleted", { itemId: id, userId });

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    logger.error("Failed to delete item", { error });
    next(error);
  }
});

export { router as itemsRouter };
