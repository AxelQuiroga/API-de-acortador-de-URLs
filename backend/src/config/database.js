import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: false,
    });

    await mongoose.syncIndexes();

    console.log("✅ MongoDB conectado correctamente.");
  } catch (error) {
    console.error("❌ Error al conectar con MongoDB.");
    console.error(error.message);

    process.exit(1);
  }
};