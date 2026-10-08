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
export function access(user: User, session: string) {
  return jwt.sign(
    {
      _id: user._id.toString(),
      sid: crypto.createHash("sha256").update(session).digest("hex"),
    },
    secret(),
    {
      expiresIn: "15m",
      algorithm: "HS256",
    },
  );
}
export async function sessionResponse(user: User, res: Response) {
  const refresh = crypto.randomBytes(64).toString("hex");
  await Utilisateur.updateOne(
    { _id: user._id },
    {
      $push: {
        sessions: {
          $each: [
            { token: refresh, expiresAt: Date.now() / 1000 + 10 * 86400 },
          ],
          $slice: -10,
        },
      },
    },
  );
  res
    .set("x-refresh-token", refresh)
    .set("x-access-token", access(user, refresh))
    .json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
    });
}
