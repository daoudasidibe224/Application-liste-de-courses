import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Utilisateur } from "../db/models/index.ts";
import { access, sessionResponse } from "../auth.ts";
import {
  credentials,
  record,
  text,
  HttpError,
  type ApiRequest,
} from "../contracts.ts";
const router = Router();
const unauthorized = () =>
  new HttpError("Email, mot de passe ou session invalide.", 401);
router.post("/utilisateurs", async (req: ApiRequest, res) => {
  const body = record(req.body),
    data = credentials(body);
  const user = await Utilisateur.create({
    ...data,
    nom: text(body.nom, 100),
    prenom: text(body.prenom, 100),
  });
  await sessionResponse(user, res);
});
router.post("/utilisateurs/login", async (req: ApiRequest, res) => {
  const { email, mdp } = credentials(req.body),
    user = await Utilisateur.findOne({ email });
  if (!user || !(await bcrypt.compare(mdp, user.mdp))) throw unauthorized();
  await sessionResponse(user, res);
});
router.get("/utilisateurs/moi/access-token", async (req, res) => {
  const id = req.get("_id"),
    token = req.get("x-refresh-token");
  if (!mongoose.isObjectIdOrHexString(id) || !token) throw unauthorized();
  const user = await Utilisateur.findOne({
    _id: id,
    sessions: { $elemMatch: { token, expiresAt: { $gt: Date.now() / 1000 } } },
  });
  if (!user) throw unauthorized();
  const accessToken = access(user);
  res.set("x-access-token", accessToken).json({ accessToken });
});
router.post("/utilisateurs/logout", async (req, res) => {
  const id = req.get("_id"),
    token = req.get("x-refresh-token");
  if (mongoose.isObjectIdOrHexString(id) && token)
    await Utilisateur.updateOne(
      { _id: id },
      { $pull: { sessions: { token } } },
    );
  res.sendStatus(204);
});
export default router;
