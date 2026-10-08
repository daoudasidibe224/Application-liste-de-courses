const { connect } = require('./db/mongoose');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères.');
}
const app = require('./app');
connect().then(() => {
  const server = app.listen(process.env.PORT || 3000, () => console.log('API courses prête.'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => {
    await require('mongoose').disconnect(); process.exit(0);
  }));
}).catch(error => { console.error(error.message); process.exitCode = 1; });
