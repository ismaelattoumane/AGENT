# Multi-Agent System

Plateforme d'agents IA autonomes collaboratifs — backend NestJS, frontend Next.js, Discord + Telegram.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     UTILISATEUR                         │
│            Discord / Telegram / Web Dashboard           │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
       ┌───────▼───────┐    ┌─────────▼─────────┐
       │  Bot Discord  │    │   Bot Telegram    │
       │  Bot Discord  │    │   Bot Telegram    │
       └───────┬───────┘    └─────────┬─────────┘
               └──────────┬───────────┘
                          │
              ┌───────────▼───────────────┐
              │      Backend NestJS       │
              │                           │
              │  ┌─────────────────────┐  │
              │  │ Orchestration Engine │ │
              │  │  (LangGraph-style)   │ │
              │  └──────────┬──────────┘  │
              │             │             │
              │  ┌──────────▼──────────┐  │
              │  │     8 Agents IA     │  │
              │  │  PM · Analyst · Arch│  │
              │  │  Back · Front · DO  │  │
              │  │  QA · Writer        │  │
              │  └──────────┬──────────┘  │
              │             │             │
              │  ┌──────────▼──────────┐  │
              │  │   LLM Router        │  │
              │  │  Claude/GPT/Gemini  │  │
              │  │  + Fallback auto    │  │
              │  └─────────────────────┘  │
              └───┬───────────┬───────────┘
                  │           │
         ┌────────▼───┐  ┌────▼──────┐
         │ PostgreSQL │  │   Qdrant  │
         │   Redis    │  │ (mémoire) │
         └────────────┘  └───────────┘
```

---

## Stack

| Composant    | Technologie                  |
|-------------|------------------------------|
| Backend     | NestJS · TypeScript          |
| Frontend    | Next.js 14 · Tailwind        |
| LLM         | Claude · GPT-4o · Gemini     |
| Orchestration | Workflow engine custom     |
| Base de données | PostgreSQL + TypeORM    |
| Cache       | Redis                        |
| Mémoire     | Qdrant (vector DB)           |
| Bots        | discord.js · Grammy          |
| Déploiement | Docker + Docker Compose      |

---

## Installation

### Prérequis

- Ubuntu Server 22.04+
- Docker 24+
- Docker Compose v2

### 1. Cloner et configurer

```bash
git clone <votre-repo>
cd multi-agent-system
cp .env.example .env
nano .env
```

### 2. Variables `.env` à remplir obligatoirement

```env
# LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...      # optionnel, pour enregistrement slash commands plus rapide

# Telegram
TELEGRAM_BOT_TOKEN=...

# Sécurité
JWT_SECRET=mot_de_passe_long_et_random
ADMIN_PASSWORD=votre_mot_de_passe_admin
```

### 3. Lancer

```bash
docker compose up -d
```

### 4. Vérifier

```bash
docker compose ps
docker compose logs backend -f
```

Frontend : http://localhost:3001
Backend API : http://localhost:3000/api
Login : `admin` / votre `ADMIN_PASSWORD`

---

## Obtenir les tokens

### Discord Bot

1. https://discord.com/developers/applications
2. New Application → Bot → Reset Token
3. Copier le token → `DISCORD_BOT_TOKEN`
4. Copier Application ID → `DISCORD_CLIENT_ID`
5. OAuth2 → URL Generator → `bot` + `applications.commands`
6. Permissions : `Send Messages`, `Use Slash Commands`
7. Inviter le bot sur votre serveur

### Telegram Bot

1. Ouvrir [@BotFather](https://t.me/BotFather) sur Telegram
2. `/newbot` → suivre les instructions
3. Copier le token → `TELEGRAM_BOT_TOKEN`
4. Envoyer `/start` au bot pour activer les notifications

---

## Utilisation

### Via le dashboard web

1. Se connecter sur http://localhost:3001
2. Cliquer **+ Nouvelle mission**
3. Renseigner titre + description détaillée
4. Cliquer **Lancer**

### Via Discord

```
/new titre:Mon SaaS description:Créer une application SaaS de gestion de stock
/status
/tasks mission_id:abc123
/answer mission_id:abc123 answer:Next.js
/cancel mission_id:abc123
```

### Via Telegram

```
/start
/new Mon SaaS | Créer une application SaaS de gestion de stock
/status
/answer abc123 Next.js
/cancel abc123
```

---

## Agents & LLM assignés

| Agent               | LLM par défaut | Rôle                              |
|--------------------|---------------|-----------------------------------|
| Chef de Projet      | Claude        | Planification, coordination       |
| Analyste            | Gemini        | Recherche, analyse besoins        |
| Architecte          | Claude        | Architecture, choix techniques    |
| Développeur Backend | GPT-4o        | API, BDD, auth                    |
| Développeur Frontend| GPT-4o        | UI, React, intégration            |
| DevOps              | GPT-4o        | Docker, CI/CD, infra              |
| Testeur QA          | GPT-4o        | Tests, qualité                    |
| Rédacteur           | Claude        | Documentation, rapports           |

Fallback automatique : Claude → GPT → Gemini. Reprise après 60s.

---

## Workflow d'exécution

```
PLAN → EXECUTE → REVIEW → COMPLETE
         ↑           |
         └───────────┘ (si nouvelles tâches)
              ↕
          USER_INPUT (si question critique)
```

1. **PLAN** : Le Chef de Projet analyse la mission et crée le plan de tâches.
2. **EXECUTE** : Chaque agent exécute ses tâches dans l'ordre des dépendances.
3. **REVIEW** : Le Chef de Projet vérifie si les objectifs sont atteints.
4. **USER_INPUT** : Pause si un agent pose une question critique.
5. **COMPLETE** : Le Rédacteur génère le rapport final.

---

## Maintenance

### Logs

```bash
docker compose logs backend -f      # Backend
docker compose logs frontend -f     # Frontend
```

### Base de données

```bash
docker compose exec postgres psql -U mas_user -d mas_db
```

### Mise à jour

```bash
git pull
docker compose build
docker compose up -d
```

### Reset complet

```bash
docker compose down -v
docker compose up -d
```

---

## Sécurité

- Changer `JWT_SECRET` et `ADMIN_PASSWORD` avant la mise en production.
- Mettre un reverse proxy Nginx devant avec SSL (Let's Encrypt).
- Ne jamais exposer les ports 5432, 6379, 6333 sur l'internet public.

---

*Système conçu pour une autonomie maximale avec intervention humaine minimale.*

---

[(C) 2026 ISMADVL- Tous droits réservés.](https://ismadev.free.nf)
@ismaelattoumane