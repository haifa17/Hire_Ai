# TalentBridge AI — Frontend

Interface utilisateur de la plateforme **TalentBridge AI**, construite avec **Next.js 16**, **TypeScript**, **Tailwind CSS** et **Zustand**.

---

## Stack technique

| Outil                   | Rôle                            |
| ----------------------- | ------------------------------- |
| Next.js 16 (App Router) | Framework React SSR/SSG         |
| TypeScript 5            | Typage statique                 |
| Tailwind CSS 4          | Styles utilitaires              |
| Zustand 5 + `persist`   | Gestion d'état global (auth)    |
| Axios                   | Client HTTP + intercepteurs JWT |
| Lucide React            | Icônes                          |

---

## Prérequis

- Node.js ≥ 18
- npm ≥ 9
- Le **backend** doit tourner sur `http://localhost:3000`

---

## Installation

```bash
cd frontend
npm install
```

## Variables d'environnement

Copiez le fichier `.env.example` en `.env` à la racine du dossier `frontend`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-oss-20b
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

`GROQ_API_KEY` est utilisee cote serveur dans l'endpoint Next.js `POST /api/ai/enhance` comme fournisseur principal. Si Groq renvoie une erreur de timeout, rate limit, modele indisponible, reponse vide ou erreur de requete, l'endpoint bascule automatiquement vers OpenRouter via `OPENROUTER_API_KEY`.

L'endpoint est utilise pour reformuler automatiquement:

- Professional Summary
- Experience Description & Achievements
- Education Description
- Project Description
- Suggested skills

## Lancer en développement

```bash
npm run dev
```

L'application sera disponible sur **http://localhost:3001**.

## Build de production

```bash
npm run build
npm run start
```

---

## Structure du projet

```
src/
├── app/                        # Pages (App Router Next.js)
│   ├── login/                  # Page de connexion
│   ├── register/               # Page d'inscription
│   ├── forgot-password/        # Demande de réinitialisation
│   ├── reset-password/         # Nouveau mot de passe
│   ├── verify-email/           # Vérification d'adresse email
│   └── dashboard/              # Espace connecté (layout protégé)
│       ├── candidate/          # Dashboard candidat
│       ├── recruiter/          # Dashboard recruteur
│       └── admin/              # Dashboard administrateur
├── components/
│   ├── layout/                 # Navbar, Footer
│   └── ui/                     # Composants réutilisables (Button, Card…)
├── domain/
│   └── models/                 # Interfaces TypeScript (User, Job…)
├── lib/
│   ├── api.ts                  # Instance Axios + intercepteurs JWT
│   └── utils.ts                # Helpers CSS (cn)
├── services/
│   └── authService.ts          # Appels API d'authentification
└── store/
    └── useAuthStore.ts         # Store Zustand persisté (user, tokens)
```

---

## Authentification

Le flux complet est implémenté :

1. **Inscription** → `POST /api/v1/auth/register` — envoie un email de vérification
2. **Vérification email** → `POST /api/v1/auth/verify-email` — lien reçu par email
3. **Connexion** → `POST /api/v1/auth/login` — retourne `accessToken` + `refreshToken`
4. **Refresh silencieux** → `POST /api/v1/auth/refresh` — intercepteur Axios automatique sur 401
5. **Déconnexion** → `POST /api/v1/auth/logout` — invalide le refresh token côté serveur
6. **Mot de passe oublié** → `POST /api/v1/auth/forgot-password`
7. **Réinitialisation** → `POST /api/v1/auth/reset-password`

Les tokens sont stockés dans `localStorage` via Zustand `persist`. Le dashboard est protégé : tout accès non authentifié est redirigé vers `/login`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
