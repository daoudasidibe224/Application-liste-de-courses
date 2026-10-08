import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { Response } from "express";
import type { HydratedDocument, InferSchemaType } from "mongoose";
import { Utilisateur } from "./db/models/index.ts";
type User = HydratedDocument<InferSchemaType<typeof Utilisateur.schema>>;
export function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET invalide.");
  return process.env.JWT_SECRET;
}
export function access(user: User) {
  return jwt.sign({ _id: user._id.toString() }, secret(), {
    expiresIn: "15m",
    algorithm: "HS256",
  });
}
export async function sessionResponse(user: User, res: Response) {
  const refresh = crypto.randomBytes(64).toString("hex");
  const active = user.sessions
    .filter((session) => session.expiresAt > Date.now() / 1000)
    .slice(-9);
  user.sessions.splice(0, user.sessions.length, ...active, {
    token: refresh,
    expiresAt: Date.now() / 1000 + 10 * 86400,
  });
  await user.save();
  res.set("x-refresh-token", refresh).set("x-access-token", access(user)).json({
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
  });
}
