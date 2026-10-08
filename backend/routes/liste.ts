import { Router, type Response } from "express";
import { randomUUID, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Liste, Piece, Utilisateur } from "../db/models/index.ts";
import { secret } from "../auth.ts";
import {
  record,
  text,
  revision,
  productDetails,
  HttpError,
  type ApiRequest,
} from "../contracts.ts";
const router = Router();
const conflict = () =>
  new HttpError(
    "Cette donnée a changé dans un autre onglet. Vérifiez la version actualisée avant de réessayer.",
    409,
  );
function creationKey(req: ApiRequest) {
  const key = req.get("Idempotency-Key") || randomUUID();
  if (!/^[0-9a-f-]{36}$/i.test(key)) throw new TypeError("Clé invalide");
  return key;
}
const missing = () => new HttpError("Liste ou produit introuvable.", 404);
router.use(async (req, res, next) => {
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
    if (typeof payload.sid !== "string") throw new Error();
    const user = await Utilisateur.findById(payload._id);
    if (
      !user?.sessions.some(
        (session) =>
          session.expiresAt > Date.now() / 1000 &&
          createHash("sha256").update(session.token).digest("hex") ===
            payload.sid,
      )
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
    deleted: { $ne: true },
  });
  if (!list) throw missing();
  return list;
}
router.get("/", async (_req, res) =>
  res.json(
    await Liste.find({ _idUtilisateur: userId(res), deleted: { $ne: true } }),
  ),
);
router.post("/", async (req: ApiRequest, res) => {
  const titre = text(record(req.body).titre),
    key = creationKey(req);
  const list = await Liste.findOneAndUpdate(
    { _idUtilisateur: userId(res), creationKey: key },
    {
      $setOnInsert: {
        titre,
        _idUtilisateur: userId(res),
        creationKey: key,
        deleted: false,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  if (!list || list.deleted || list.titre !== titre) throw conflict();
  res.status(201).json(list);
});
router.patch("/:id", async (req: ApiRequest, res) => {
  await owned(req, res);
  const body = record(req.body),
    expected = revision(body.version);
  const list = await Liste.findOneAndUpdate(
    {
      _id: req.params.id,
      _idUtilisateur: userId(res),
      deleted: { $ne: true },
      __v: expected,
    },
    { $set: { titre: text(body.titre) }, $inc: { __v: 1 } },
    { returnDocument: "after", runValidators: true },
  );
  if (!list) throw conflict();
  res.json(list);
});
router.delete("/:id", async (req: ApiRequest, res) => {
  await owned(req, res);
  const expected = revision(record(req.body).version);
  const list = await Liste.findOneAndUpdate(
    {
      _id: req.params.id,
      _idUtilisateur: userId(res),
      deleted: { $ne: true },
      __v: expected,
    },
    { $set: { deleted: true }, $inc: { __v: 1 } },
    { returnDocument: "after" },
  );
  if (!list) throw conflict();
  await Piece.deleteMany({ _listeId: list._id });
  res.json(list);
});
router.get("/:id/pieces", async (req: ApiRequest, res) => {
  await owned(req, res);
  res.json(await Piece.find({ _listeId: req.params.id }).sort({ _id: 1 }));
});
router.post("/:id/pieces", async (req: ApiRequest, res) => {
  await owned(req, res);
  const body = record(req.body),
    titre = text(body.titre),
    details = productDetails(body, true),
    key = creationKey(req);
  const piece = await Piece.findOneAndUpdate(
    { _listeId: req.params.id, creationKey: key },
    {
      $setOnInsert: {
        titre,
        ...details,
        _listeId: req.params.id,
        creationKey: key,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  if (
    !piece ||
    piece.titre !== titre ||
    piece.quantity !== details.quantity ||
    piece.unit !== details.unit ||
    piece.category !== details.category
  )
    throw conflict();
  if (!(await Liste.exists({ _id: req.params.id, deleted: { $ne: true } }))) {
    await piece.deleteOne();
    throw missing();
  }
  res.status(201).json(piece);
});
router.patch("/:id/pieces/:pieceId", async (req: ApiRequest, res) => {
  await owned(req, res);
  const body = record(req.body),
    updates: {
      titre?: string;
      achetee?: boolean;
      quantity?: number;
      unit?: string;
      category?: string;
    } = productDetails(body);
  if (Object.hasOwn(body, "titre")) updates.titre = text(body.titre);
  if (Object.hasOwn(body, "achetee")) {
    if (typeof body.achetee !== "boolean")
      throw new TypeError("Statut invalide");
    updates.achetee = body.achetee;
  }
  if (!Object.keys(updates).length) throw new TypeError("Modification vide");
  const piece = await Piece.findOneAndUpdate(
    {
      _id: req.params.pieceId,
      _listeId: req.params.id,
      __v: revision(body.version),
    },
    { $set: updates, $inc: { __v: 1 } },
    { returnDocument: "after", runValidators: true },
  );
  if (!piece) {
    if (
      await Piece.exists({ _id: req.params.pieceId, _listeId: req.params.id })
    )
      throw conflict();
    throw missing();
  }
  res.json(piece);
});
router.delete("/:id/pieces/:pieceId", async (req: ApiRequest, res) => {
  await owned(req, res);
  const piece = await Piece.findOneAndDelete({
    _id: req.params.pieceId,
    _listeId: req.params.id,
    __v: revision(record(req.body).version),
  });
  if (!piece) {
    if (
      await Piece.exists({ _id: req.params.pieceId, _listeId: req.params.id })
    )
      throw conflict();
    throw missing();
  }
  res.json(piece);
});
export default router;
