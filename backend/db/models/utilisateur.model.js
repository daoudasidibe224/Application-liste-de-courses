const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const schema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true, maxlength: 100 },
  prenom: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  mdp: { type: String, required: true, minlength: 8 },
  sessions: [{ token: { type: String, required: true }, expiresAt: { type: Number, required: true } }]
});
schema.methods.toJSON = function () {
  const { mdp, sessions, ...user } = this.toObject();
  return user;
};
schema.statics.getJWTSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET invalide.');
  return process.env.JWT_SECRET;
};
schema.methods.generateAccessAuthToken = async function () {
  return jwt.sign({ _id: this._id.toString() }, this.constructor.getJWTSecret(), { expiresIn: '15m', algorithm: 'HS256' });
};
schema.methods.creerSession = async function () {
  const token = crypto.randomBytes(64).toString('hex');
  this.sessions = this.sessions.filter(session => session.expiresAt > Date.now() / 1000).slice(-9);
  this.sessions.push({ token, expiresAt: Date.now() / 1000 + 10 * 86400 });
  await this.save();
  return token;
};
schema.pre('save', async function () {
  if (this.isModified('mdp')) this.mdp = await bcrypt.hash(this.mdp, 12);
});
const Utilisateur = mongoose.model('Utilisateur', schema);
module.exports = { Utilisateur };
