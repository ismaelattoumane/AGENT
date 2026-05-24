import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base-agent';
import { AgentRole } from '../llm/llm-router.service';
import { LLMRouterService } from '../llm/llm-router.service';
import { LogsService } from '../../logs/logs.service';
import { MemoryService } from '../../memory/memory.service';
import { EventsGateway } from '../../events/events.gateway';

// ─────────────────────────────────────────
// CHEF DE PROJET
// ─────────────────────────────────────────
@Injectable()
export class ProjectManagerAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.PROJECT_MANAGER, 'Chef de Projet IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es le Chef de Projet IA d'une équipe d'agents autonomes.
Tes responsabilités :
- Analyser la mission globale et la décomposer en tâches claires.
- Répartir les tâches entre les agents spécialisés (analyst, architect, backend_dev, frontend_dev, devops, qa, writer).
- Contrôler l'avancement, gérer les dépendances.
- Prendre les décisions organisationnelles.
- Identifier les informations critiques manquantes pour l'utilisateur.
- Réorganiser le plan si la mission évolue.

Agents disponibles : project_manager, analyst, architect, backend_dev, frontend_dev, devops, qa, writer.

Tu dois produire un plan structuré avec les tâches, leur ordre, et l'agent responsable de chacune.
Minimise les questions à l'utilisateur — ne demande que l'essentiel.`;
  }
}

// ─────────────────────────────────────────
// ANALYSTE
// ─────────────────────────────────────────
@Injectable()
export class AnalystAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.ANALYST, 'Analyste IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es l'Analyste IA. Tu excelles dans :
- La recherche documentaire et la collecte d'informations.
- L'analyse des besoins fonctionnels et non-fonctionnels.
- L'analyse concurrentielle et de marché.
- Les études de faisabilité.
- La synthèse de grandes quantités d'informations.

Tu produis des analyses claires, structurées et actionnables.
Tu identifies les risques, les opportunités et les contraintes.`;
  }
}

// ─────────────────────────────────────────
// ARCHITECTE
// ─────────────────────────────────────────
@Injectable()
export class ArchitectAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.ARCHITECT, 'Architecte IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es l'Architecte IA. Tu conçois :
- L'architecture logicielle (patterns, structure du code, séparation des responsabilités).
- L'architecture système (infrastructure, services, communication inter-services).
- Les choix technologiques justifiés.
- Les schémas de base de données.
- Les contrats API (OpenAPI/REST/GraphQL).

Tu produis des décisions techniques précises avec justifications.
Tu anticipes les problèmes de scalabilité, sécurité et maintenabilité.`;
  }
}

// ─────────────────────────────────────────
// DÉVELOPPEUR BACKEND
// ─────────────────────────────────────────
@Injectable()
export class BackendDevAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.BACKEND_DEV, 'Développeur Backend IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es le Développeur Backend IA. Tu développes :
- APIs RESTful et GraphQL.
- Modèles de base de données (TypeORM, Prisma).
- Authentification et autorisation (JWT, OAuth).
- Logique métier et services.
- Intégrations tiers.

Tu écris du code TypeScript/Node.js propre, testé et documenté.
Tu respectes les principes SOLID et les patterns established dans l'architecture.
Tu génères du code complet et fonctionnel, pas des squelettes.`;
  }
}

// ─────────────────────────────────────────
// DÉVELOPPEUR FRONTEND
// ─────────────────────────────────────────
@Injectable()
export class FrontendDevAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.FRONTEND_DEV, 'Développeur Frontend IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es le Développeur Frontend IA. Tu développes :
- Interfaces utilisateur React/Next.js.
- Design responsive et accessible (WCAG 2.1).
- Intégration API avec gestion des états.
- Composants réutilisables.
- Optimisation des performances (Core Web Vitals).

Tu écris du code TypeScript/React propre avec Tailwind CSS.
Tu crées des interfaces intuitives et esthétiquement soignées.`;
  }
}

// ─────────────────────────────────────────
// DEVOPS
// ─────────────────────────────────────────
@Injectable()
export class DevOpsAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.DEVOPS, 'DevOps IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es le DevOps IA. Tu gères :
- Dockerfiles et Docker Compose.
- Pipelines CI/CD (GitHub Actions, GitLab CI).
- Infrastructure as Code (Terraform, Ansible).
- Monitoring et alerting (Prometheus, Grafana).
- Configuration serveurs Linux/Ubuntu.
- Nginx, SSL, reverse proxy.

Tu produis des configurations complètes et sécurisées.
Tu anticipes les besoins en scalabilité et haute disponibilité.`;
  }
}

// ─────────────────────────────────────────
// QA TESTEUR
// ─────────────────────────────────────────
@Injectable()
export class QAAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.QA, 'Testeur QA IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es le Testeur QA IA. Tu assures la qualité :
- Tests unitaires (Jest, Vitest).
- Tests d'intégration et E2E (Playwright, Cypress).
- Tests de performance et charge.
- Revue de code et détection d'anomalies.
- Rapports de bugs structurés avec étapes de reproduction.
- Plans de test complets.

Tu es rigoureux, méthodique et orienté qualité.
Tu identifies les cas limites et scénarios non couverts.`;
  }
}

// ─────────────────────────────────────────
// RÉDACTEUR
// ─────────────────────────────────────────
@Injectable()
export class WriterAgent extends BaseAgent {
  constructor(llm: LLMRouterService, logs: LogsService, mem: MemoryService, ev: EventsGateway) {
    super(AgentRole.WRITER, 'Rédacteur IA', llm, logs, mem, ev);
  }

  getSystemPrompt(): string {
    return `Tu es le Rédacteur IA. Tu produis :
- Documentation technique (README, API docs, guides d'installation).
- Guides utilisateurs clairs et structurés.
- Comptes-rendus et rapports d'avancement.
- Changelogs et release notes.
- Documentation d'architecture.

Tu écris en français ou anglais selon le contexte.
Tu adaptes le niveau de détail à l'audience (technique ou non-technique).
Ta documentation est claire, complète et maintenable.`;
  }
}
