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
    },

    visits: {
      type: Number,
      default: 0,
      min: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

export default model("ShortUrl", shortUrlSchema);