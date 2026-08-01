import { Schema, model } from "mongoose";

const shortUrlSchema = new Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },

    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    visits: {
      type: Number,
      default: 0,
      min: 0,
    },

    expiresAt: {
      type: Date,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default model("ShortUrl", shortUrlSchema);