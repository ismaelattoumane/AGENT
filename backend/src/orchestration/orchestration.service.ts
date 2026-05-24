import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionEntity, MissionStatus } from '../missions/mission.entity';
import { TaskEntity, TaskStatus } from '../tasks/task.entity';
import { AgentsService } from '../agents/agents.service';
import { AgentRole } from '../agents/llm/llm-router.service';
import { LogsService } from '../logs/logs.service';
import { EventsGateway } from '../events/events.gateway';
import { MessagingService } from '../messaging/messaging.service';
import { AgentTask } from '../agents/base-agent';

export enum WorkflowNodeType {
  PLAN       = 'plan',
  EXECUTE    = 'execute',
  REVIEW     = 'review',
  USER_INPUT = 'user_input',
  COMPLETE   = 'complete',
}

interface WorkflowState {
  mission: MissionEntity;
  tasks: TaskEntity[];
  pendingUserQuestions: string[];
  currentNode: WorkflowNodeType;
  iteration: number;
}

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);
  private activeWorkflows: Map<string, WorkflowState> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly MAX_ITERATIONS = 50;

  constructor(
    @InjectRepository(MissionEntity) private missionRepo: Repository<MissionEntity>,
    @InjectRepository(TaskEntity) private taskRepo: Repository<TaskEntity>,
    private agentsService: AgentsService,
    private logsService: LogsService,
    private eventsGateway: EventsGateway,
    private messagingService: MessagingService,
  ) {}

  // ─────────────────────────────────────────
  // START MISSION WORKFLOW
  // ─────────────────────────────────────────
  async startMission(missionId: string): Promise<void> {
    const mission = await this.missionRepo.findOne({
      where: { id: missionId },
      relations: ['tasks'],
    });
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.IN_PROGRESS;
    await this.missionRepo.save(mission);

    const state: WorkflowState = {
      mission,
      tasks: [],
      pendingUserQuestions: [],
      currentNode: WorkflowNodeType.PLAN,
      iteration: 0,
    };

    this.activeWorkflows.set(missionId, state);
    this.logger.log(`Workflow started for mission: ${mission.title}`);

    // Run asynchronously
    this.runWorkflow(missionId).catch(err => {
      this.logger.error(`Workflow error for ${missionId}: ${err.message}`);
    });
  }

  // ─────────────────────────────────────────
  // MAIN WORKFLOW LOOP (LangGraph-style)
  // ─────────────────────────────────────────
  private async runWorkflow(missionId: string): Promise<void> {
    const state = this.activeWorkflows.get(missionId);
    if (!state) return;

    while (
      state.currentNode !== WorkflowNodeType.COMPLETE &&
      state.iteration < this.MAX_ITERATIONS
    ) {
      state.iteration++;
      this.logger.log(`[${missionId}] Node: ${state.currentNode} (iter ${state.iteration})`);

      switch (state.currentNode) {
        case WorkflowNodeType.PLAN:
          await this.nodePlan(state);
          break;
        case WorkflowNodeType.EXECUTE:
          await this.nodeExecute(state);
          break;
        case WorkflowNodeType.REVIEW:
          await this.nodeReview(state);
          break;
        case WorkflowNodeType.USER_INPUT:
          // Pause - will be resumed by answerUserQuestion()
          return;
        case WorkflowNodeType.COMPLETE:
          break;
      }

      // Refresh mission from DB
      state.mission = await this.missionRepo.findOne({ where: { id: missionId } });
      if (state.mission.status === MissionStatus.CANCELLED) return;
    }

    // Mark complete
    state.mission.status = MissionStatus.COMPLETED;
    await this.missionRepo.save(state.mission);
    this.activeWorkflows.delete(missionId);

    await this.logsService.create({
      missionId,
      agent: 'Système',
      action: 'mission_completed',
      message: `Mission "${state.mission.title}" terminée avec succès`,
    });

    this.eventsGateway.broadcast('mission_completed', { missionId, title: state.mission.title });
    await this.messagingService.notifyAll(`✅ Mission terminée : **${state.mission.title}**`);
  }

  // ─────────────────────────────────────────
  // NODE: PLAN
  // ─────────────────────────────────────────
  private async nodePlan(state: WorkflowState): Promise<void> {
    const planTask: AgentTask = {
      id: `plan-${state.mission.id}`,
      missionId: state.mission.id,
      title: 'Planification de la mission',
      description: `
Analyse cette mission et crée un plan d'exécution détaillé.

Mission : ${state.mission.title}
Description : ${state.mission.description}
Contraintes : ${JSON.stringify(state.mission.constraints || {})}

Produis un plan avec des tâches ordonnées, leurs agents assignés, et leurs dépendances.
Les agents disponibles : analyst, architect, backend_dev, frontend_dev, devops, qa, writer.
`,
    };

    const result = await this.agentsService.dispatch(AgentRole.PROJECT_MANAGER, planTask);

    if (!result.success) {
      this.logger.error('Planning failed');
      state.currentNode = WorkflowNodeType.COMPLETE;
      return;
    }

    // Parse and create tasks
    if (result.nextTasks?.length) {
      const tasks = await Promise.all(
        result.nextTasks.map((t, idx) =>
          this.taskRepo.save(
            this.taskRepo.create({
              missionId: state.mission.id,
              title: t.title,
              description: t.description,
              assignedRole: (t as any).assignedRole || AgentRole.ANALYST,
              status: TaskStatus.PENDING,
              context: { order: idx },
            })
          )
        )
      );
      state.tasks = tasks;
    }

    // Save plan to mission
    state.mission.plan = { output: result.output, createdAt: new Date() };
    await this.missionRepo.save(state.mission);

    // Check if user questions
    if (result.questionsForUser?.length) {
      state.pendingUserQuestions = result.questionsForUser;
      state.currentNode = WorkflowNodeType.USER_INPUT;

      state.mission.status = MissionStatus.USER_INPUT;
      await this.missionRepo.save(state.mission);

      await this.messagingService.askUser(
        state.mission.id,
        result.questionsForUser.join('\n')
      );
    } else {
      state.currentNode = WorkflowNodeType.EXECUTE;
    }
  }

  // ─────────────────────────────────────────
  // NODE: EXECUTE
  // ─────────────────────────────────────────
  private async nodeExecute(state: WorkflowState): Promise<void> {
    const pendingTasks = await this.taskRepo.find({
      where: { missionId: state.mission.id, status: TaskStatus.PENDING },
      order: { createdAt: 'ASC' },
    });

    if (!pendingTasks.length) {
      state.currentNode = WorkflowNodeType.REVIEW;
      return;
    }

    // Execute tasks that have no pending dependencies
    const readyTasks = pendingTasks.filter(task => {
      if (!task.dependencies?.length) return true;
      // Check all deps are completed
      return task.dependencies.every(depId =>
        state.tasks.find(t => t.id === depId && t.status === TaskStatus.COMPLETED)
      );
    });

    for (const task of readyTasks) {
      task.status = TaskStatus.IN_PROGRESS;
      await this.taskRepo.save(task);

      const agentTask: AgentTask = {
        id: task.id,
        missionId: task.missionId,
        title: task.title,
        description: task.description,
        context: {
          ...task.context,
          missionPlan: state.mission.plan,
          userAnswers: state.mission.userAnswers,
        },
        dependencies: task.dependencies,
      };

      const result = await this.agentsService.dispatch(task.assignedRole, agentTask);

      if (result.success) {
        task.status = TaskStatus.COMPLETED;
        task.output = result.output;
        task.artifacts = result.artifacts;
        await this.taskRepo.save(task);

        // Spawn new tasks if agent suggests them
        if (result.nextTasks?.length) {
          for (const nt of result.nextTasks) {
            await this.taskRepo.save(
              this.taskRepo.create({
                missionId: state.mission.id,
                title: nt.title,
                description: nt.description,
                assignedRole: (nt as any).assignedRole || AgentRole.QA,
                status: TaskStatus.PENDING,
              })
            );
          }
        }

        // Handle user questions
        if (result.questionsForUser?.length) {
          state.pendingUserQuestions = result.questionsForUser;
          state.currentNode = WorkflowNodeType.USER_INPUT;
          state.mission.status = MissionStatus.USER_INPUT;
          await this.missionRepo.save(state.mission);
          await this.messagingService.askUser(state.mission.id, result.questionsForUser.join('\n'));
          return;
        }
      } else {
        task.retryCount = (task.retryCount || 0) + 1;
        if (task.retryCount >= this.MAX_RETRIES) {
          task.status = TaskStatus.FAILED;
          task.error = result.error;
        } else {
          task.status = TaskStatus.PENDING;
        }
        await this.taskRepo.save(task);
      }
    }

    // Check if more tasks pending
    const remaining = await this.taskRepo.count({
      where: { missionId: state.mission.id, status: TaskStatus.PENDING },
    });

    if (remaining === 0) {
      state.currentNode = WorkflowNodeType.REVIEW;
    }
  }

  // ─────────────────────────────────────────
  // NODE: REVIEW
  // ─────────────────────────────────────────
  private async nodeReview(state: WorkflowState): Promise<void> {
    const completedTasks = await this.taskRepo.find({
      where: { missionId: state.mission.id, status: TaskStatus.COMPLETED },
    });

    const reviewTask: AgentTask = {
      id: `review-${state.mission.id}`,
      missionId: state.mission.id,
      title: 'Revue finale de la mission',
      description: `
Revue de la mission "${state.mission.title}".
Tâches complétées : ${completedTasks.length}
Résumés : ${completedTasks.map(t => `- ${t.title}: ${t.output?.substring(0, 200)}`).join('\n')}

Vérifie que tous les objectifs sont atteints. 
Si des tâches manquent, propose-les (nextTasks).
Sinon, indique que la mission est complète.
`,
    };

    const result = await this.agentsService.dispatch(AgentRole.PROJECT_MANAGER, reviewTask);

    if (result.nextTasks?.length) {
      // More work to do
      for (const nt of result.nextTasks) {
        await this.taskRepo.save(
          this.taskRepo.create({
            missionId: state.mission.id,
            title: nt.title,
            description: nt.description,
            assignedRole: (nt as any).assignedRole || AgentRole.WRITER,
            status: TaskStatus.PENDING,
          })
        );
      }
      state.currentNode = WorkflowNodeType.EXECUTE;
    } else {
      // Generate final report via writer
      const reportTask: AgentTask = {
        id: `report-${state.mission.id}`,
        missionId: state.mission.id,
        title: 'Rapport final',
        description: `Génère un rapport de synthèse complet pour la mission "${state.mission.title}".`,
        context: { completedTasks: completedTasks.map(t => ({ title: t.title, output: t.output })) },
      };
      await this.agentsService.dispatch(AgentRole.WRITER, reportTask);
      state.currentNode = WorkflowNodeType.COMPLETE;
    }
  }

  // ─────────────────────────────────────────
  // ANSWER USER QUESTION - resumes workflow
  // ─────────────────────────────────────────
  async answerUserQuestion(missionId: string, answer: string): Promise<void> {
    const state = this.activeWorkflows.get(missionId);
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) return;

    // Store answer
    mission.userAnswers = {
      ...(mission.userAnswers || {}),
      [new Date().toISOString()]: answer,
      lastAnswer: answer,
    };
    mission.status = MissionStatus.IN_PROGRESS;
    await this.missionRepo.save(mission);

    await this.logsService.create({
      missionId,
      agent: 'Utilisateur',
      action: 'user_answer',
      message: answer,
    });

    if (state) {
      state.mission = mission;
      state.currentNode = state.tasks.length ? WorkflowNodeType.EXECUTE : WorkflowNodeType.PLAN;
      state.pendingUserQuestions = [];

      // Resume workflow
      this.runWorkflow(missionId).catch(err =>
        this.logger.error(`Workflow resume error: ${err.message}`)
      );
    } else {
      // No active state - restart
      this.activeWorkflows.set(missionId, {
        mission,
        tasks: [],
        pendingUserQuestions: [],
        currentNode: WorkflowNodeType.PLAN,
        iteration: 0,
      });
      this.runWorkflow(missionId).catch(err =>
        this.logger.error(`Workflow restart error: ${err.message}`)
      );
    }
  }

  // ─────────────────────────────────────────
  // UPDATE MISSION (change of requirements)
  // ─────────────────────────────────────────
  async updateMission(missionId: string, newDescription: string): Promise<void> {
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) return;

    mission.description = newDescription;
    await this.missionRepo.save(mission);

    await this.logsService.create({
      missionId,
      agent: 'Système',
      action: 'mission_updated',
      message: `Mission mise à jour. Replanification en cours...`,
    });

    // Reset tasks and replan
    await this.taskRepo.update(
      { missionId, status: TaskStatus.PENDING },
      { status: TaskStatus.SKIPPED }
    );

    const state = this.activeWorkflows.get(missionId) || {
      mission,
      tasks: [],
      pendingUserQuestions: [],
      currentNode: WorkflowNodeType.PLAN,
      iteration: 0,
    };

    state.currentNode = WorkflowNodeType.PLAN;
    state.mission = mission;
    this.activeWorkflows.set(missionId, state);

    this.runWorkflow(missionId).catch(err =>
      this.logger.error(`Workflow update error: ${err.message}`)
    );
  }

  getWorkflowState(missionId: string): WorkflowState | undefined {
    return this.activeWorkflows.get(missionId);
  }
}
