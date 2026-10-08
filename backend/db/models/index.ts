import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { units, categories } from "../../contracts.ts";
const owner = { type: mongoose.Schema.Types.ObjectId, required: true };
const title = {
  type: String,
  required: true,
  trim: true,
  minlength: 1,
  maxlength: 200,
};
export const Liste = mongoose.model(
  "Liste",
  new mongoose.Schema(
    {
      titre: title,
      _idUtilisateur: owner,
      deleted: { type: Boolean, default: false },
      archived: { type: Boolean, default: false },
      copyPending: { type: Boolean, default: false },
      copySource: { type: String },
      copyVersion: { type: Number },
      copySnapshot: [
        { titre: title, quantity: Number, unit: String, category: String },
      ],
      creationKey: { type: String },
    },
    { optimisticConcurrency: true },
  ),
);
export const Piece = mongoose.model(
  "Piece",
  new mongoose.Schema({
    titre: title,
    _listeId: owner,
    achetee: { type: Boolean, default: false },
    quantity: { type: Number, default: 1, min: 0.001, max: 999 },
    unit: { type: String, enum: units, default: "pièce" },
    category: { type: String, enum: categories, default: "Autres" },
    creationKey: { type: String },
  }),
);
Liste.schema.index(
  { _idUtilisateur: 1, creationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { creationKey: { $type: "string" } },
  },
);
Piece.schema.index(
  { _listeId: 1, creationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { creationKey: { $type: "string" } },
  },
);
const users = new mongoose.Schema({
  nom: { type: String, default: "", trim: true, maxlength: 100 },
  prenom: { type: String, default: "", trim: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  mdp: { type: String, required: true, minlength: 8 },
  sessions: [
    {
      token: { type: String, required: true },
      expiresAt: { type: Number, required: true },
    },
  ],
});
users.pre("save", async function () {
  if (this.isModified("mdp")) this.mdp = await bcrypt.hash(this.mdp, 12);
});
export const Utilisateur = mongoose.model("Utilisateur", users);
