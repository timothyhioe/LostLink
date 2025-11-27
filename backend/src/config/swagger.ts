import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LostLink API",
      version: "1.0.0",
      description: "Smart Lost & Found Platform API for Hochschule Darmstadt",
      contact: {
        name: "LostLink Team",
      },
      license: {
        name: "ISC",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format: Bearer <token>",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "User ID",
            },
            name: {
              type: "string",
              description: "User full name",
            },
            email: {
              type: "string",
              format: "email",
              description: "University email (@stud.h-da.de)",
            },
            emailVerified: {
              type: "boolean",
              description: "Email verification status",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
            },
          },
        },
        Item: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Item ID",
            },
            userId: {
              oneOf: [
                { type: "string" },
                { $ref: "#/components/schemas/User" },
              ],
              description: "User who posted the item",
            },
            type: {
              type: "string",
              enum: ["lost", "found"],
              description: "Item type",
            },
            title: {
              type: "string",
              description: "Item title",
            },
            description: {
              type: "string",
              description: "Item description",
            },
            location: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["Point"],
                },
                coordinates: {
                  type: "array",
                  items: { type: "number" },
                  minItems: 2,
                  maxItems: 2,
                  description: "[longitude, latitude]",
                },
                buildingName: {
                  type: "string",
                  description: "Building or location name",
                },
              },
            },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  filename: { type: "string" },
                  uploadedAt: { type: "string", format: "date-time" },
                },
              },
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Item tags",
            },
            status: {
              type: "string",
              enum: ["open", "matched", "resolved", "closed"],
              description: "Item status",
            },
            matchCount: {
              type: "integer",
              description: "Number of matches found",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and registration",
      },
      {
        name: "Items",
        description: "Lost and found items management",
      },
      {
        name: "Health",
        description: "Health check endpoints",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
