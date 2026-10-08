# Carnet de courses

Une application pour préparer ses courses et suivre les produits achetés. Chaque compte dispose de ses propres listes, enregistrées dans MongoDB.

## Ce que l'on peut faire

- Créer un compte, se connecter et se déconnecter.
- Créer, renommer et supprimer ses listes.
- Ajouter rapidement un produit, modifier son nom et le supprimer.
- Indiquer sa quantité, son unité et son rayon ; corriger ces valeurs sans les perdre au rechargement.
- Regrouper le ticket par rayon ou trier par nom, produits à acheter et ordre d’ajout.
- Activer le mode magasin : cases agrandies, progression visible et outils de préparation repliés pour accéder aux produits.
- Changer de liste depuis l’index du carnet, présent aussi dans l’éditeur.
- Cocher les produits achetés et suivre l'avancement du panier.
- Imprimer un ticket de courses sans les menus et les boutons.
- Filtrer les produits à acheter ou déjà achetés et chercher un produit par son nom.

Le ticket blanc, les titres Barlow Condensed et les onglets rouges rappellent un carnet d’épicerie. Les polices Barlow sont servies localement sous licence OFL, conservée dans `frontend/src/assets/fonts`.

L'inscription demande seulement un email et un mot de passe. Le mot de passe peut être affiché à la demande ; une erreur de connexion reçoit le focus. Sur téléphone390px, email, mot de passe et bouton tiennent dans le premier écran. Une session valide ouvre directement les listes ; une déconnexion dans un autre onglet ferme également les vues privées de ce navigateur. Une coupure réseau pendant le renouvellement conserve la session pour réessayer. Les anciens noms et prénoms en base ne sont pas nécessaires au compte.

Les quantités vont de 0,001 à 999, avec trois décimales maximum. Les unités proposées sont pièce, kg, g, L, mL, paquet et bouteille. Les rayons sont Fruits et légumes, Frais, Épicerie, Boulangerie, Maison et Autres. Les anciens produits prennent les valeurs 1 pièce / Autres sans perdre leur titre ni leur état. L'ajout rapide remet le focus dans la saisie pour enchaîner les produits.

Le tri et le mode magasin sont retenus sur cet appareil, séparément pour chaque compte. Ces préférences restent dans le navigateur ; les listes et produits restent dans MongoDB. Si le navigateur ne peut pas enregistrer une préférence, un message le signale.

L'interface s'adapte au téléphone et au bureau. Les formulaires ont des libellés, les actions restent accessibles au clavier et les erreurs apparaissent près du contenu concerné. La suppression d'une liste ou d'un produit demande confirmation.

## Stack

Angular 22 avec composants standalone et TypeScript 6 pour le client. TypeScript strict côté client et API. Node.js, Express 5, Mongoose 9, MongoDB, bcrypt et JWT pour l'API. Le projet utilise du CSS natif et n'a pas de dépendance à un service payant.

## Installation

Il faut Node.js **24.15 ou plus récent** et MongoDB **8.x** accessible localement ou à distance.

Depuis la racine du dépôt :

```sh
npm ci --prefix backend
npm ci --prefix frontend
cp backend/.env.example backend/.env
```

Dans `backend/.env`, renseigner `MONGODB_URI` et un `JWT_SECRET` aléatoire d'au moins 32 caractères. Pour produire un secret :

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Démarrer l'API dans un terminal :

```sh
npm run dev --prefix backend
```

Puis démarrer le client dans un autre terminal :

```sh
npm start --prefix frontend
```

Ouvrir [http://localhost:4200](http://localhost:4200). Le client utilise `/api`, redirigé vers l'API locale sur le port 3000 par `frontend/proxy.conf.json`. Si le port de l'API change, ajuster ce fichier.

## Configuration

| Variable de l'API | Usage                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| `MONGODB_URI`     | Adresse MongoDB, obligatoire                                            |
| `JWT_SECRET`      | Secret de signature, obligatoire, au moins 32 caractères                |
| `PORT`            | Port HTTP, 3000 par défaut                                              |
| `CLIENT_ORIGIN`   | Origine exacte autorisée pour un client hébergé séparément, facultative |

Le serveur refuse de démarrer sans configuration valide. Ne pas publier le fichier `.env`. Après un changement de secret, les utilisateurs doivent se reconnecter.

## Scripts et tests

```sh
npm run lint --prefix frontend
npm run build --prefix frontend
npm run check --prefix frontend
npm run check --prefix backend
npm test --prefix backend
```

La suite API démarre une instance MongoDB isolée avec `mongodb-memory-server`. Elle vérifie l'authentification, les sessions, les opérations sur les listes et produits, la validation des données et l'isolation entre comptes, les métadonnées produit, la révocation immédiate et les connexions simultanées. Les créations répétées avec une même clé ne produisent qu'un élément. Les modifications utilisent une version atomique : deux onglets ne peuvent pas écraser silencieusement la même donnée. Le premier lancement peut télécharger un binaire MongoDB et nécessite un accès réseau.

Pour le parcours navigateur :

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
```

Playwright lance une API avec une base de test temporaire et le client sur le port 4534. Les ports 4434 et 4534 doivent être libres. Les tests couvrent le clavier, la persistance après rechargement, un parcours complet, les doubles soumissions, les conflits entre onglets, l'annulation, une panne réseau, l'impression, les quantités/rayons, le tri, le mode magasin, la navigation rapide, les préférences après rechargement et le débordement horizontal aux largeurs 320, 390, 800 et 1440 pixels.

L'API s'exécute sans surveillance de fichiers avec `npm start --prefix backend`. Le build du client se trouve dans `frontend/dist/frontend/browser`.

## Hébergement et limites

Pour un hébergement, servir le build Angular et rediriger `/api` vers l'API. Les URL du client nécessitent un repli vers `index.html`. Utiliser HTTPS, sauvegarder MongoDB et limiter l'accès réseau à la base.

Les jetons d'accès expirent après 15 minutes et le client les renouvelle grâce à une session de dix jours. Chaque accès est lié à cette session, vérifiée côté serveur : la déconnexion réussie révoque immédiatement les jetons de cette session, sans fermer les autres connexions du compte. Dix sessions maximum sont conservées par compte. Si le serveur est indisponible au moment de la déconnexion, le navigateur ferme sa session locale mais ne peut pas confirmer la révocation distante. Le client conserve les jetons dans le stockage local du navigateur. Un conflit recharge les données récentes et conserve le texte en cours de saisie. Les listes supprimées gardent un marqueur en base afin qu'une ancienne requête de création ne les recrée pas ; leurs produits sont supprimés.

Le projet n'intègre pas de réinitialisation de mot de passe, de vérification d'email, de partage entre comptes ni de mode hors ligne.
