import mongoose, { Schema, Document, Model, Types, mongo } from "mongoose";

export interface IItem extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId; //founder (who posted it)
  type: "lost" | "found";
  title: string;
  description: string;
  location: {
    type: "Point";
    coordinates: [number, number]; //[longitude, latitude] GeoJSON format
    buildingName: string; //z.B. "D14/1.2" , "Mensa"
  };
  images: Array<{
    url: string; //presigned minIO URL
    filename: string; //S3 key for deletion (z.B. "items/123-photo.jpg")
    uploadedAt: Date;
  }>;
  tags: string[]; //z.B. ["wallet", "black", "leather"]
  status: "open" | "matched" | "resolved" | "closed";
  matchCount: number; //potential matches found
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      buildingName: {
        type: String,
        required: true, //false for 'lost' items. user might forgot where they lose their stuff (make it optional)
        trim: false,
      },
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        filename: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    status: {
      type: String,
      enum: ["open", "matched", "resolved", "closed"],
      default: "open",
    },
    matchCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ItemSchema.index({ title: "text", description: "text" }); //text search
ItemSchema.index({ location: "2dsphere" }); //geospatial queries
ItemSchema.index({ type: 1, status: 1, createdAt: -1 }); //common queries
ItemSchema.index({ userId: 1, createdAt: -1 }); //user's items

export const Item: Model<IItem> = mongoose.model<IItem>("Item", ItemSchema);
