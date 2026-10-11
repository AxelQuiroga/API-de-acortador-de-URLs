import mongoose from "mongoose";
import ShortUrl from "../models/shortUrl.model.js";
import { env } from "./env.js";

export const connectDatabase = async () => {
  try {
    console.log(`Intentando conectar a: ${env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: false,
    });

    console.log("✅ MongoDB conectado correctamente.");
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}`);

    // createIndexes builds declared indexes without dropping indexes managed externally.
    await ShortUrl.createIndexes();
    console.log("✅ Índices requeridos verificados.");

  } catch (error) {
    console.error("❌ Error al conectar con MongoDB.");
    console.error(`   Tipo: ${error.name}`);
    console.error("   No se pudo establecer la conexión con la base de datos.");
    process.exit(1);
  }
};