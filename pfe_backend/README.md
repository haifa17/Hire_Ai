# TalentBridge AI — Backend

API REST de la plateforme **TalentBridge AI**, construite avec **NestJS 10**, **Prisma 7**, **PostgreSQL** et une authentification **JWT** double-token (access + refresh).

---

## Stack technique

| Outil                 | Rôle                                        |
| --------------------- | ------------------------------------------- |
| NestJS 10             | Framework Node.js modulaire                 |
| TypeScript 5          | Typage statique                             |
| Prisma 7 + PostgreSQL | ORM + base de données                       |
| Passport JWT          | Stratégies access & refresh token           |
| Bcrypt                | Hachage des mots de passe et refresh tokens |
| Nodemailer            | Envoi d'emails (vérification, reset)        |
| Swagger               | Documentation API interactive               |
| Helmet                | Sécurité HTTP headers                       |
| Throttler             | Rate limiting                               |

---

## Prérequis

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL en cours d'exécution

---

## Installation

```bash
cd backend
npm install
```

## Variables d'environnement

Créez un fichier `.env` à la racine du dossier `backend` :

```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=TalentBridge AI
FRONTEND_URL=http://localhost:3001

# Base de données
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/talentbridge_ai

# JWT
JWT_ACCESS_SECRET=votre_secret_access
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=votre_secret_refresh
JWT_REFRESH_EXPIRATION=7d

# Email (ex: Mailtrap pour le dev)
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=votre_user
MAIL_PASS=votre_pass
MAIL_FROM=noreply@talentbridge-ai.com

# Sécurité
THROTTLE_TTL=60
THROTTLE_LIMIT=10
PASSWORD_RESET_EXPIRATION_MINUTES=30
EMAIL_VERIFICATION_EXPIRATION_HOURS=24
AI_SERVICE_URL=http://127.0.0.1:8001

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

## Base de données

```bash
# Appliquer les migrations
npm run prisma:migrate:dev

# Générer le client Prisma
npm run prisma:generate

# Ouvrir Prisma Studio
npm run prisma:studio
```

## Lancer en développement

```bash
npm run start:dev
```

L'API sera disponible sur **http://localhost:3000**.  
La documentation Swagger est accessible sur **http://localhost:3000/api/docs**.

## Matching AI

Le backend expose `POST /api/v1/applications/match-preview` pour proxyfier un payload CV/offre vers le microservice Python de matching. Le frontend Next.js appelle ce endpoint, et NestJS transmet ensuite la requête à `AI_SERVICE_URL`.

## Build de production

```bash
npm run build
npm run start:prod
```

## Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Couverture
npm run test:cov
```

---

## Structure du projet

```
src/
├── common/
│   ├── decorators/         # @CurrentUser, @Public, @Roles
│   ├── exceptions/         # AppException personnalisée
│   ├── filters/            # GlobalExceptionFilter (format uniforme)
│   ├── interceptors/       # ResponseInterceptor (enveloppe { success, data, message })
│   └── interfaces/         # ApiResponse
├── config/                 # app, jwt, mail, throttle configs
├── database/               # PrismaService + DatabaseModule
└── modules/
    ├── auth/
    │   ├── controllers/    # AuthController
    │   ├── dto/            # RegisterDto, LoginDto, ResetPasswordDto…
    │   ├── guards/         # JwtAuthGuard, JwtRefreshGuard, RolesGuard
    │   ├── interfaces/     # JwtPayload, AuthTokens, AuthResponse
    │   ├── services/       # AuthService
    │   └── strategies/     # JwtAccessStrategy, JwtRefreshStrategy
    ├── common/
    │   └── mail/           # MailService (nodemailer)
    └── user/
        ├── repositories/   # UserRepositoryImpl (Prisma)
        └── user.service.ts
```

---

## Endpoints d'authentification

Tous les endpoints sont sous le préfixe `/api/v1/auth`.

| Méthode | Route              | Accès                 | Description                                |
| ------- | ------------------ | --------------------- | ------------------------------------------ |
| POST    | `/register`        | Public                | Inscription + email de vérification        |
| POST    | `/verify-email`    | Public                | Valider le token reçu par email            |
| POST    | `/login`           | Public                | Connexion → `accessToken` + `refreshToken` |
| POST    | `/refresh`         | Public + RefreshGuard | Rotation des tokens                        |
| POST    | `/logout`          | Authentifié           | Invalidation du refresh token              |
| POST    | `/forgot-password` | Public                | Envoi du lien de réinitialisation          |
| POST    | `/reset-password`  | Public                | Changement de mot de passe                 |

### Format de réponse uniforme

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-03-05T10:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### Sécurité JWT

- **Access token** — envoyé dans le header `Authorization: Bearer <token>` (durée : 15 min)
- **Refresh token** — envoyé dans le corps de la requête `{ refreshToken }` (durée : 7 jours), stocké haché en base avec bcrypt
