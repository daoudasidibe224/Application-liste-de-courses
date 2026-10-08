const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '16kb' }));
// Le proxy Angular utilise la même origine. CORS est opt-in pour un client distant.
app.use((req, res, next) => {
  if (process.env.CLIENT_ORIGIN && req.headers.origin === process.env.CLIENT_ORIGIN) {
    res.set('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN);
    res.vary('Origin');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-access-token, x-refresh-token, _id');
    res.set('Access-Control-Expose-Headers', 'x-access-token, x-refresh-token');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/utilisateurs', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, message: { message: 'Trop de demandes. Réessayez dans quelques minutes.' } }));
app.use('/', require('./routes/utilisateur'));
app.use('/listes', require('./routes/liste'));
app.use((req, res) => res.status(404).json({ message: 'Ressource introuvable.' }));
app.use((error, req, res, next) => {
  const status = error.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error.name) || error instanceof TypeError || error.status === 400 ? 400 : error.status || 500;
  const message = status === 409 ? 'Cette adresse email est déjà utilisée.' : status === 400 ? 'Vérifiez les informations saisies.' : status < 500 ? error.message : 'Une erreur est survenue. Réessayez.';
  res.status(status).json({ message });
});
module.exports = app;
