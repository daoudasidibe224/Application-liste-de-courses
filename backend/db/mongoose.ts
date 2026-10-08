import mongoose from "mongoose";
export { mongoose };
export async function connect(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error("MONGODB_URI doit être renseigné.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}
