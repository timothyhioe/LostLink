import multer from "multer";
import { Request } from "express";

//configure multer to store files in memory as buffers
const storage = multer.memoryStorage();

//filter to only accept images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  //only accpet image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

//configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 7 * 1024 * 1024, // 7MB max file size
  },
});

//middleware for single image upload
export const uploadSingle = upload.single("image");

//middleware for multiple images (max 5)
export const uploadMultiple = upload.array("images", 5);
