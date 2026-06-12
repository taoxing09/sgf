# SGF Group V11, Wow Production

Version orientée présentation client et production test.

## Ce qui a été amélioré

- Direction artistique plus premium, plus immersive et plus fluide.
- Retour vers l'esprit V5 Motion, avec des animations moins lourdes.
- Logo officiel SGF France intégré dans le header, le footer et l'admin.
- Sélection France ou Bénin visible aussi sur mobile.
- Changement France ou Bénin beaucoup plus visible : couleurs, textes, secteurs et portail.
- Transitions de texte plus fluides au changement de territoire.
- Textes réécrits pour SGF, plus corporate, plus crédibles, moins génériques.
- SEO renforcé : title, description, Open Graph, Twitter Card, canonical, JSON LD Organization.
- Footer légal avec capital social, SIREN, SIRET, RCS, APE et siège.
- Back-office événements conservé : connexion admin, CRUD, publication ou brouillon, inscriptions, export CSV.

## Tester en local

```bash
npm install
cp .env.example .env
npm start
```

Puis ouvrir :

```txt
http://localhost:3000
http://localhost:3000/admin.html
```

Le mot de passe admin se règle dans `.env` avec :

```env
ADMIN_PASSWORD=VotreMotDePasse
SESSION_SECRET=un-secret-long-et-aleatoire
```

Après modification du `.env`, relancer le serveur.

## Déployer pour test

Le plus simple : GitHub puis Render.

Build command :

```bash
npm install
```

Start command :

```bash
npm start
```

Variables d'environnement à ajouter sur Render :

```env
ADMIN_PASSWORD=VotreMotDePasseFort
SESSION_SECRET=un-secret-long-et-aleatoire
CONTACT_EMAIL=contact.sgffrance@gmail.com
DATA_DIR=./data
```

Pour une vraie production, utiliser une base persistante au lieu du fichier `data/events.json`.
