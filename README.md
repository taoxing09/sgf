# SGF Group — V9 Production Admin

Version V9 basée sur l'esprit **V5 Motion** : premium, fluide, corporate, avec back-office événements renforcé.

## Contenu

- Site public premium SGF France / SGF Bénin
- Footer légal SGF France : SIREN, SIRET, capital, RCS, APE, siège social
- Événements dynamiques depuis API
- Modal de réservation événement avec inscription persistée côté serveur
- Formulaire de demande de rendez-vous
- Back-office `admin.html` avec connexion
- CRUD événements complet via API
- Inscriptions exportables en CSV
- Backend Node/Express prêt pour déploiement

## Lancer en local

```bash
npm install
cp .env.example .env
npm start
```

Puis ouvrir :

- Site public : http://localhost:3000
- Admin : http://localhost:3000/admin.html

Mot de passe admin local par défaut si `.env` non configuré : `changeme-sgf-admin`

⚠️ À changer impérativement avant mise en production.

## Variables d'environnement importantes

```env
PORT=3000
CONTACT_EMAIL=contact.sgffrance@gmail.com
ADMIN_PASSWORD=mot-de-passe-fort
SESSION_SECRET=secret-long-aleatoire
SENDGRID_API_KEY=
SENDGRID_FROM=no-reply@sgf-group.fr
DATA_DIR=./data
```

## API événements

Public :

- `GET /api/events`
- `POST /api/event-registrations`
- `POST /api/booking`

Admin :

- `POST /api/admin/login`
- `GET /api/admin/events`
- `POST /api/admin/events`
- `PATCH /api/admin/events/:id`
- `DELETE /api/admin/events/:id`
- `GET /api/admin/registrations`
- `GET /api/admin/registrations.csv`

## Important pour Render

Le backend fonctionne sur Render, mais il ne faut pas considérer Render Free comme une vraie production avec persistance fichier.

Pour une production propre :

1. Front public sur Cloudflare Pages / Netlify / Vercel / Render Static Site.
2. API sur Render Starter ou VPS.
3. Données dans Supabase, Neon PostgreSQL ou une base persistante.

La V9 persiste actuellement les événements dans `data/events.json` et les inscriptions dans `data/registrations.json`. C'est bien pour une démo, un VPS ou un serveur avec disque persistant. Ce n'est pas idéal sur Render Free.

## Recommandation finale

Pour SGF :

- Présenter cette V9 comme prototype premium administrable.
- Livrer en production avec une base externe type Supabase/Neon ou avec un hébergement serveur persistant.
- Configurer Microsoft Bookings pour les rendez-vous Teams réels.
