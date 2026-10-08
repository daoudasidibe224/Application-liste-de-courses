import mongoose from "mongoose";
import bcrypt from "bcryptjs";
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
  nom: { type: String, required: true, trim: true, maxlength: 100 },
  prenom: { type: String, required: true, trim: true, maxlength: 100 },
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
