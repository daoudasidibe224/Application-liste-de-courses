const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoose, connect } = require('../db/mongoose.ts');
process.env.JWT_SECRET = 'integration-tests-secret-with-at-least-32-characters';
const app = require('../app.ts').default;
const { Utilisateur, Piece } = require('../db/models/index.ts');
let database;
before(async () => { database = await MongoMemoryServer.create(); await connect(database.getUri()); await Utilisateur.init(); });
after(async () => { await mongoose.disconnect(); await database?.stop(); });
test('comptes, sessions, listes et produits restent isolés', async (t) => {
  const createUser = email => request(app).post('/utilisateurs').send({ nom: 'Test', prenom: 'Camille', email, mdp: 'Passphrase-123' }).expect(200);
  const alice = await createUser('alice@example.fr'), bob = await createUser('bob@example.fr');
  const token = alice.headers['x-access-token'];
  const auth = req => req.set('x-access-token', token);
  let list, piece;
  await t.test('réponses publiques sans mot de passe ni sessions', async () => {
    assert.equal(alice.body.mdp, undefined); assert.equal(alice.body.sessions, undefined);
    assert.notEqual((await Utilisateur.findById(alice.body._id)).mdp, 'Passphrase-123');
    await request(app).post('/utilisateurs/login').send({ email: 'ALICE@EXAMPLE.FR', mdp: 'Passphrase-123' }).expect(200);
    await request(app).post('/utilisateurs/login').send({ email: { $ne: null }, mdp: 'Passphrase-123' }).expect(400);
    await request(app).post('/utilisateurs').send({ nom: 'Test', prenom: 'Camille', email: 'alice@example.fr', mdp: 'Passphrase-123' }).expect(409);
  });
  await t.test('création, correction et contrôle des champs', async () => {
    await auth(request(app).post('/listes')).send({ titre: '   ' }).expect(400);
    list = (await auth(request(app).post('/listes')).send({ titre: ' Courses ', _idUtilisateur: bob.body._id }).expect(201)).body;
    assert.equal(list._idUtilisateur, alice.body._id);
    assert.equal(list.titre, 'Courses');
    piece = (await auth(request(app).post(`/listes/${list._id}/pieces`)).send({ titre: 'Tomates' }).expect(201)).body;
    await auth(request(app).patch(`/listes/${list._id}/pieces/${piece._id}`)).send({ titre: 'Tomates cerises', achetee: true, version: 0, _listeId: new mongoose.Types.ObjectId() }).expect(200);
    const products = (await auth(request(app).get(`/listes/${list._id}/pieces`)).expect(200)).body;
    assert.equal(products[0].titre, 'Tomates cerises'); assert.equal(products[0].achetee, true); assert.equal(products[0]._listeId, list._id);
    await auth(request(app).patch(`/listes/${list._id}`)).send({ titre: 'Samedi', version: 0, _idUtilisateur: bob.body._id }).expect(200);
    await auth(request(app).patch(`/listes/${list._id}/pieces/${piece._id}`)).send({ achetee: 'yes' }).expect(400);
  });
  await t.test('un autre compte ne peut lire ni modifier les produits', async () => {
    for (const method of ['get', 'post', 'patch', 'delete']) {
      const path = ['patch', 'delete'].includes(method) ? `/listes/${list._id}/pieces/${piece._id}` : `/listes/${list._id}/pieces`;
      await request(app)[method](path).set('x-access-token', bob.headers['x-access-token']).send({ titre: 'Intrusion' }).expect(404);
    }
    await request(app).patch(`/listes/${list._id}`).set('x-access-token', bob.headers['x-access-token']).send({ titre: 'Intrusion' }).expect(404);
    assert.deepEqual((await request(app).get('/listes').set('x-access-token', bob.headers['x-access-token']).expect(200)).body, []);
  });
  await t.test('erreurs déterministes et authentification requise', async () => {
    await request(app).get('/listes').expect(401);
    await auth(request(app).get('/listes/invalide/pieces')).expect(400);
    await auth(request(app).get(`/listes/${new mongoose.Types.ObjectId()}/pieces`)).expect(404);
    await auth(request(app).patch(`/listes/${list._id}/pieces/${new mongoose.Types.ObjectId()}`)).send({ achetee: true, version: 0 }).expect(404);
  });
  await t.test('suppression du produit et cascade de liste', async () => {
    await auth(request(app).delete(`/listes/${list._id}/pieces/${piece._id}`)).send({ version: 1 }).expect(200);
    await auth(request(app).post(`/listes/${list._id}/pieces`)).send({ titre: 'Pain' }).expect(201);
    await auth(request(app).delete(`/listes/${list._id}`)).send({ version: 1 }).expect(200);
    assert.equal(await Piece.countDocuments({ _listeId: list._id }), 0);
    await auth(request(app).delete(`/listes/${list._id}`)).expect(404);
  });
  await t.test('renouvellement puis révocation de la session', async () => {
    const headers = { '_id': alice.body._id, 'x-refresh-token': alice.headers['x-refresh-token'] };
    const response = await request(app).get('/utilisateurs/moi/access-token').set(headers).expect(200);
    assert.ok(response.body.accessToken);
    await request(app).post('/utilisateurs/logout').set(headers).expect(204);
    await request(app).get('/utilisateurs/moi/access-token').set(headers).expect(401);
  });
});


test('créations répétées et éditions concurrentes restent déterministes', async () => {
 const user = await request(app).post('/utilisateurs').send({ nom:'Test',prenom:'Concurrence',email:'concurrent@example.fr',mdp:'Passphrase-123' }).expect(200);
 const token=user.headers['x-access-token'], key=require('node:crypto').randomUUID();
 const create=()=>request(app).post('/listes').set('x-access-token',token).set('Idempotency-Key',key).send({titre:'Ticket concurrent'});
 const created=await Promise.all([create(),create()]); assert.deepEqual(created.map(result=>result.status),[201,201]); assert.equal(created[0].body._id,created[1].body._id);
 const id=created[0].body._id;
 const renames=await Promise.all(['Un','Deux'].map(titre=>request(app).patch('/listes/'+id).set('x-access-token',token).send({titre,version:0})));
 assert.deepEqual(renames.map(result=>result.status).sort(),[200,409]);
 const pieceKey=require('node:crypto').randomUUID(), add=()=>request(app).post(`/listes/${id}/pieces`).set('x-access-token',token).set('Idempotency-Key',pieceKey).send({titre:'Poires'});
 const products=await Promise.all([add(),add()]); assert.deepEqual(products.map(result=>result.status),[201,201]);assert.equal(products[0].body._id,products[1].body._id);
 const product=products[0].body;
 const toggles=await Promise.all([true,false].map(achetee=>request(app).patch(`/listes/${id}/pieces/${product._id}`).set('x-access-token',token).send({achetee,version:0})));
 assert.deepEqual(toggles.map(result=>result.status).sort(),[200,409]);assert.equal((await Piece.findById(product._id)).__v,1);
 await request(app).delete('/listes/'+id).set('x-access-token',token).send({version:0}).expect(409);
 await request(app).delete('/listes/'+id).set('x-access-token',token).send({version:1}).expect(200);
 await create().expect(409); assert.equal(await Piece.countDocuments({_listeId:id}),0);
});
