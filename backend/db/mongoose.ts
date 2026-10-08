import mongoose from "mongoose";
import { Liste, Piece } from "./models/index.ts";
export { mongoose };
export async function connect(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error("MONGODB_URI doit être renseigné.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Liste.init(), Piece.init()]);
}
