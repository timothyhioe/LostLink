import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import multer from "multer";

import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Only trust proxy in production
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // Trust first proxy
}

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (env.CORS_ORIGIN === "*") {
      // Allow all origins
      callback(null, true);
    } else {
      const allowedOrigins = env.CORS_ORIGIN.split(",").map(o => o.trim());
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow in development
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "http://localhost:5000", // Allow images from API
          "http://localhost:5174", // Vite dev frontend port
          "http://localhost:5173", // Alternative Vite port
        ],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5174", "http://localhost:5173"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded cross-origin
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Disable rate limiter in development
if (env.NODE_ENV === "production") {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
}

app.get("/", (_req, res) => {
  res.json({ message: "LostLink API", version: "0.1.0" });
});

// Swagger API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "LostLink API Documentation",
    customfavIcon: "/favicon.ico",
  })
);

app.use("/api", apiRouter);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File too large. Max size is 7MB." });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    next(err);
  }
);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
