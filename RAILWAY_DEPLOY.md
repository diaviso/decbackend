# Guide de déploiement Railway - DEC Learning Backend

## 📋 Prérequis

- Compte Railway (https://railway.app)
- Compte GitHub avec le repository du projet
- Base de données PostgreSQL (fournie par Railway)

## 🚀 Étapes de déploiement

### 1. Créer un nouveau projet sur Railway

1. Connectez-vous à Railway
2. Cliquez sur "New Project"
3. Sélectionnez "Deploy from GitHub repo"
4. Choisissez votre repository backend

### 2. Ajouter une base de données PostgreSQL

1. Dans votre projet Railway, cliquez sur "+ New"
2. Sélectionnez "Database" → "PostgreSQL"
3. Railway créera automatiquement la variable `DATABASE_URL`

### 3. Connecter la base de données au service backend

1. Cliquez sur votre service backend
2. Allez dans l'onglet "Variables"
3. Cliquez sur "+ New Variable" → "Add Reference"
4. Sélectionnez la base de données PostgreSQL
5. Choisissez `DATABASE_URL`

### 4. Configurer les variables d'environnement

Dans l'onglet "Variables" de votre service backend, ajoutez :

```
DATABASE_URL=<automatique depuis PostgreSQL>
JWT_SECRET=<générer une clé de 64 caractères>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<votre ID Google OAuth>
GOOGLE_CLIENT_SECRET=<votre secret Google>
GOOGLE_CALLBACK_URL=https://votre-backend.railway.app/auth/google/callback
OPENAI_API_KEY=<votre clé OpenAI>
STRIPE_SECRET_KEY=<votre clé Stripe>
STRIPE_WEBHOOK_SECRET=<votre secret webhook Stripe>
FRONTEND_URL=https://votre-frontend.vercel.app
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=<votre email>
MAIL_PASS=<mot de passe d'application Gmail>
MAIL_FROM="DEC Learning <votre-email>"
```

### 5. Déployer

1. Railway détectera automatiquement les changements sur GitHub
2. Le build utilisera `nixpacks.toml` pour la configuration
3. Attendez que le déploiement soit terminé

### 6. Initialiser la base de données avec pgvector

**IMPORTANT** : Ce projet utilise RAG (Retrieval-Augmented Generation) avec des embeddings vectoriels. Vous devez activer l'extension pgvector avant d'exécuter les migrations.

#### Option A : Via Railway CLI (Recommandé)

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Lier le projet
cd /chemin/vers/backend
railway link

# 1. Activer l'extension pgvector
railway run npm run db:init

# 2. Exécuter les migrations Prisma
railway run npx prisma migrate deploy
```

#### Option B : Depuis votre machine locale

```bash
# Récupérer l'URL publique de la base de données depuis Railway
# (dans l'onglet Variables de PostgreSQL)

# 1. Activer l'extension pgvector
DATABASE_URL="postgresql://..." npm run db:init

# 2. Exécuter les migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

#### Option C : Directement via SQL (si vous avez accès à la console PostgreSQL)

```sql
-- Se connecter à la base de données Railway
-- Puis exécuter :
CREATE EXTENSION IF NOT EXISTS vector;
```

### 7. Vérifier le déploiement

1. Accédez à l'URL de votre backend : `https://votre-backend.railway.app`
2. Vérifiez que l'API répond correctement
3. Testez les endpoints principaux

## 🔧 Configuration Google OAuth

N'oubliez pas de mettre à jour votre console Google Cloud :

1. Allez sur https://console.cloud.google.com
2. Sélectionnez votre projet
3. APIs & Services → Credentials
4. Modifiez votre OAuth 2.0 Client ID
5. Ajoutez dans "Authorized redirect URIs" :
   - `https://votre-backend.railway.app/auth/google/callback`

## 🔧 Configuration Stripe Webhooks

1. Allez sur https://dashboard.stripe.com/webhooks
2. Créez un nouveau endpoint webhook
3. URL : `https://votre-backend.railway.app/stripe/webhook`
4. Copiez le secret du webhook et mettez-le dans `STRIPE_WEBHOOK_SECRET`

## 📝 Notes importantes

- Railway utilise Node.js 22.11.0
- Prisma 6.19.2 est compatible avec cette version
- Le client Prisma est généré automatiquement lors du build
- Les fichiers uploadés sont stockés dans le dossier `uploads/`
- CORS est configuré pour accepter les origines définies dans `FRONTEND_URL`

### 🤖 RAG (Retrieval-Augmented Generation)

Ce projet utilise RAG pour améliorer les réponses du chatbot avec des documents de référence :

- **Extension pgvector** : Nécessaire pour stocker et rechercher efficacement les embeddings vectoriels
- **Embeddings** : Générés avec OpenAI `text-embedding-3-small` (1536 dimensions)
- **Stockage** : Les embeddings sont stockés en JSON dans PostgreSQL
- **Recherche** : Similarité cosinus calculée pour trouver les chunks pertinents

**Fonctionnement** :
1. Les documents PDF sont uploadés via l'API `/documents/upload`
2. Le contenu est extrait et découpé en chunks
3. Des embeddings sont générés pour chaque chunk
4. Le chatbot utilise ces embeddings pour trouver le contexte pertinent
5. Les réponses sont augmentées avec les informations des documents

**Important** : L'extension pgvector doit être activée AVANT d'exécuter les migrations Prisma.

## 🐛 Dépannage

### Le build échoue

- Vérifiez les logs de build dans Railway
- Assurez-vous que toutes les dépendances sont dans `package.json`
- Vérifiez que `nixpacks.toml` est présent

### L'application ne démarre pas

- Vérifiez les logs de déploiement
- Assurez-vous que `DATABASE_URL` est correctement configurée
- Vérifiez que toutes les variables d'environnement sont présentes

### Erreurs de connexion à la base de données

- Vérifiez que la base de données PostgreSQL est bien connectée au service
- Assurez-vous que les migrations ont été exécutées
- Vérifiez l'URL de connexion dans les variables

## 🔄 Redéploiement

Pour redéployer après des modifications :

1. Poussez vos changements sur GitHub
2. Railway redéploiera automatiquement
3. Si vous avez modifié le schéma Prisma, exécutez les migrations

## 📚 Ressources

- Documentation Railway : https://docs.railway.app
- Documentation Prisma : https://www.prisma.io/docs
- Documentation NestJS : https://docs.nestjs.com
