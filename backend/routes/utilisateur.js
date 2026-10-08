const router = require('express').Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Utilisateur } = require('../db/models');
const unauthorized = () => Object.assign(new Error('Email, mot de passe ou session invalide.'), { status: 401 });
async function sessionResponse(user, res) {
  const refresh = await user.creerSession();
  res.set('x-refresh-token', refresh).set('x-access-token', await user.generateAccessAuthToken()).json(user);
}
function credentials(body) {
  if (typeof body?.email !== 'string' || typeof body?.mdp !== 'string' || body.mdp.length < 8 || Buffer.byteLength(body.mdp) > 72) throw new TypeError('Identifiants invalides');
  return { email: body.email.trim().toLowerCase(), mdp: body.mdp };
}
router.post('/utilisateurs', async (req, res) => {
  const { email, mdp } = credentials(req.body);
  if (typeof req.body.nom !== 'string' || typeof req.body.prenom !== 'string') throw new TypeError('Nom invalide');
  const user = await Utilisateur.create({ email, mdp, nom: req.body.nom, prenom: req.body.prenom });
  await sessionResponse(user, res);
});
router.post('/utilisateurs/login', async (req, res) => {
  const { email, mdp } = credentials(req.body);
  const user = await Utilisateur.findOne({ email });
  if (!user || !await bcrypt.compare(mdp, user.mdp)) throw unauthorized();
  await sessionResponse(user, res);
});
router.get('/utilisateurs/moi/access-token', async (req, res) => {
  const id = req.get('_id'), token = req.get('x-refresh-token');
  if (!mongoose.isObjectIdOrHexString(id) || !token) throw unauthorized();
  const user = await Utilisateur.findOne({ _id: id, sessions: { $elemMatch: { token, expiresAt: { $gt: Date.now() / 1000 } } } });
  if (!user) throw unauthorized();
  const accessToken = await user.generateAccessAuthToken();
  res.set('x-access-token', accessToken).json({ accessToken });
});
router.post('/utilisateurs/logout', async (req, res) => {
  const id = req.get('_id'), token = req.get('x-refresh-token');
  if (mongoose.isObjectIdOrHexString(id) && token) await Utilisateur.updateOne({ _id: id }, { $pull: { sessions: { token } } });
  res.sendStatus(204);
});
module.exports = router;
