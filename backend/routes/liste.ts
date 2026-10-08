import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Liste, Piece } from "../db/models/index.ts";
import { secret } from "../auth.ts";
import { record, text, HttpError, type ApiRequest } from "../contracts.ts";
const router = Router();
const missing = () => new HttpError("Liste ou produit introuvable.", 404);
router.use((req, res, next) => {
  try {
    const token = req.get("x-access-token");
    if (!token) throw new Error();
    const payload = jwt.verify(token, secret(), { algorithms: ["HS256"] });
    if (
      typeof payload === "string" ||
      typeof payload._id !== "string" ||
      !mongoose.isObjectIdOrHexString(payload._id)
    )
      throw new Error();
    res.locals.userId = payload._id;
    next();
  } catch {
    res
      .status(401)
      .json({ message: "Connectez-vous pour accéder à vos listes." });
  }
});
for (const key of ["id", "pieceId"])
  router.param(key, (_req, res, next, id: string) => {
    if (!mongoose.isObjectIdOrHexString(id)) {
      res.status(400).json({ message: "Identifiant invalide." });
      return;
    }
    next();
  });
function userId(res: Response): string {
  const id: unknown = res.locals.userId;
  if (typeof id !== "string") throw new HttpError("Session invalide.", 401);
  return id;
}
async function owned(req: ApiRequest, res: Response) {
  const list = await Liste.findOne({
    _id: req.params.id,
    _idUtilisateur: userId(res),
  });
  if (!list) throw missing();
  return list;
}
router.get("/", async (_req, res) =>
  res.json(await Liste.find({ _idUtilisateur: userId(res) })),
);
router.post("/", async (req: ApiRequest, res) =>
  res
    .status(201)
    .json(
      await Liste.create({
        titre: text(record(req.body).titre),
        _idUtilisateur: userId(res),
      }),
    ),
);
router.patch("/:id", async (req: ApiRequest, res) => {
  const list = await owned(req, res);
  list.titre = text(record(req.body).titre);
  await list.save();
  res.json(list);
});
router.delete("/:id", async (req: ApiRequest, res) => {
  const list = await owned(req, res);
  await Piece.deleteMany({ _listeId: list._id });
  await list.deleteOne();
  res.json(list);
});
router.get("/:id/pieces", async (req: ApiRequest, res) => {
  await owned(req, res);
  res.json(await Piece.find({ _listeId: req.params.id }));
});
router.post("/:id/pieces", async (req: ApiRequest, res) => {
  await owned(req, res);
  res
    .status(201)
    .json(
      await Piece.create({
        titre: text(record(req.body).titre),
        _listeId: req.params.id,
      }),
    );
});
router.patch("/:id/pieces/:pieceId", async (req: ApiRequest, res) => {
  await owned(req, res);
  const body = record(req.body),
    updates: { titre?: string; achetee?: boolean } = {};
  if (Object.hasOwn(body, "titre")) updates.titre = text(body.titre);
  if (Object.hasOwn(body, "achetee")) {
    if (typeof body.achetee !== "boolean")
      throw new TypeError("Statut invalide");
    updates.achetee = body.achetee;
  }
  if (!Object.keys(updates).length) throw new TypeError("Modification vide");
  const piece = await Piece.findOneAndUpdate(
    { _id: req.params.pieceId, _listeId: req.params.id },
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  );
  if (!piece) throw missing();
  res.json(piece);
});
router.delete("/:id/pieces/:pieceId", async (req: ApiRequest, res) => {
  await owned(req, res);
  const piece = await Piece.findOneAndDelete({
    _id: req.params.pieceId,
    _listeId: req.params.id,
  });
  if (!piece) throw missing();
  res.json(piece);
});
export default router;
