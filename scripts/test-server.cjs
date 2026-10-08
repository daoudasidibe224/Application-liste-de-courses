// Serveur de test isolé : aucune connexion à la base de développement.
const { MongoMemoryServer } = require('../backend/node_modules/mongodb-memory-server');
const { connect, mongoose } = require('../backend/db/mongoose.ts');
process.env.JWT_SECRET = 'browser-tests-secret-with-at-least-32-characters';
(async () => {
  const database = await MongoMemoryServer.create();
  await connect(database.getUri());
  const server = require('../backend/app.ts').default.listen(process.env.PORT || 3000);
  const stop = () => server.close(async () => { await mongoose.disconnect(); await database.stop(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
})();
