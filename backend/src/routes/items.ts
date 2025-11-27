import { Router } from "express";
import { uploadSingle } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { storageService } from "../services/storage.service";
import { logger } from "../utils/logger";
import { Item } from "../models/Item";
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

    //image upload handler
    const images = [];
    if (req.file) {
      const uploadResult = await storageService.uploadFile(req.file, "items");
      images.push({
        url: uploadResult.url,
        filename: uploadResult.filename,
        uploadedAt: new Date(),
      });
      logger.info("Image uploaded for item", {
        filename: uploadResult.filename,
      });
    }

    // Parse tags (comma-separated string to array)
    const tagArray = tags
      ? tags.split(",").map((tag: string) => tag.trim().toLowerCase())
      : [];

    const item = await Item.create({
      userId,
      title,
      description,
      type,
      location: {
        type: "Point",
        coordinates: [0, 0], //default coordinates || TODO: integrate with MapBox
        buildingName: buildingName || "Location not specified", //allow empty for lost items
      },
      images,
      tags: tagArray,
      status: "open",
      matchCount: 0,
    });

    logger.info("Item created", { itemId: item._id, userId });

    res.status(201).json({
      message: "Item created successfully",
      item,
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

    // Build query
    const query: any = {};

    if (type) query.type = type;
    if (status) query.status = status;

    // Text search
    if (search && typeof search === "string") {
      query.$text = { $search: search };
    }

    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const items = await Item.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get total count
    const total = await Item.countDocuments(query);

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

    const items = await Item.find({ userId }).sort({ createdAt: -1 });

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

    const item = await Item.findById(id).populate("userId", "name email");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ item });
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
    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check ownership
    if (item.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this item" });
    }

    // Update fields
    if (title) item.title = title;
    if (description) item.description = description;
    if (buildingName) item.location.buildingName = buildingName;
    if (status) item.status = status;

    // Update tags
    if (tags) {
      item.tags = tags
        .split(",")
        .map((tag: string) => tag.trim().toLowerCase());
    }

    // Handle new image upload
    if (req.file) {
      const uploadResult = await storageService.uploadFile(req.file, "items");
      item.images.push({
        url: uploadResult.url,
        filename: uploadResult.filename,
        uploadedAt: new Date(),
      });
      logger.info("New image added to item", { itemId: id });
    }

    await item.save();

    res.json({
      message: "Item updated successfully",
      item,
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
    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check ownership
    if (item.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this item" });
    }

    // Delete images from MinIO
    for (const image of item.images) {
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

    // Delete item from database
    await Item.findByIdAndDelete(id);

    logger.info("Item deleted", { itemId: id, userId });

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    logger.error("Failed to delete item", { error });
    next(error);
  }
});

export { router as itemsRouter };
