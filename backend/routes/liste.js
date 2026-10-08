const router = require('express').Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Liste, Piece, Utilisateur } = require('../db/models');
const missing = () => Object.assign(new Error('Liste ou produit introuvable.'), { status: 404 });
function title(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) throw new TypeError('Titre invalide');
  return value.trim();
}
router.use((req, res, next) => {
  try {
    const payload = jwt.verify(req.get('x-access-token'), Utilisateur.getJWTSecret(), { algorithms: ['HS256'] });
    if (!mongoose.isObjectIdOrHexString(payload._id)) throw new Error();
    req.userId = payload._id; next();
  } catch { res.status(401).json({ message: 'Connectez-vous pour accéder à vos listes.' }); }
});
router.param('id', (req, res, next, id) => { if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ message: 'Identifiant invalide.' }); next(); });
router.param('pieceId', (req, res, next, id) => { if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ message: 'Identifiant invalide.' }); next(); });
async function owned(req) {
  const list = await Liste.findOne({ _id: req.params.id, _idUtilisateur: req.userId });
  if (!list) throw missing();
  return list;
}
router.get('/', async (req, res) => res.json(await Liste.find({ _idUtilisateur: req.userId })));
router.post('/', async (req, res) => res.status(201).json(await Liste.create({ titre: title(req.body?.titre), _idUtilisateur: req.userId })));
router.patch('/:id', async (req, res) => {
  const list = await owned(req); list.titre = title(req.body?.titre); await list.save(); res.json(list);
});
router.delete('/:id', async (req, res) => {
  const list = await owned(req); await Piece.deleteMany({ _listeId: list._id }); await list.deleteOne(); res.json(list);
});
router.get('/:id/pieces', async (req, res) => { await owned(req); res.json(await Piece.find({ _listeId: req.params.id })); });
router.post('/:id/pieces', async (req, res) => {
  await owned(req); res.status(201).json(await Piece.create({ titre: title(req.body?.titre), _listeId: req.params.id }));
});
router.patch('/:id/pieces/:pieceId', async (req, res) => {
  await owned(req);
  const updates = {};
  if (Object.hasOwn(req.body || {}, 'titre')) updates.titre = title(req.body.titre);
  if (Object.hasOwn(req.body || {}, 'achetee')) {
    if (typeof req.body.achetee !== 'boolean') throw new TypeError('Statut invalide');
    updates.achetee = req.body.achetee;
  }
  if (!Object.keys(updates).length) throw new TypeError('Modification vide');
  const piece = await Piece.findOneAndUpdate({ _id: req.params.pieceId, _listeId: req.params.id }, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!piece) throw missing(); res.json(piece);
});
router.delete('/:id/pieces/:pieceId', async (req, res) => {
  await owned(req);
  const piece = await Piece.findOneAndDelete({ _id: req.params.pieceId, _listeId: req.params.id });
  if (!piece) throw missing(); res.json(piece);
});
module.exports = router;
