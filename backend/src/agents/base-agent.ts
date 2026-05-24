import { Logger } from '@nestjs/common';
import { LLMRouterService, AgentRole, LLMMessage, LLMProvider } from './llm/llm-router.service';
import { LogsService } from '../logs/logs.service';
import { MemoryService } from '../memory/memory.service';
import { EventsGateway } from '../events/events.gateway';

export interface AgentTask {
  id: string;
  missionId: string;
  title: string;
  description: string;
  context?: Record<string, any>;
  dependencies?: string[];
}

export interface AgentResult {
  taskId: string;
  agentRole: AgentRole;
  output: string;
  artifacts?: Record<string, any>;
  questionsForUser?: string[];
  nextTasks?: Partial<AgentTask>[];
  success: boolean;
  error?: string;
}

export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected conversationHistory: LLMMessage[] = [];

  constructor(
    public readonly role: AgentRole,
    public readonly name: string,
    protected readonly llmRouter: LLMRouterService,
    protected readonly logsService: LogsService,
    protected readonly memoryService: MemoryService,
    protected readonly eventsGateway: EventsGateway,
  ) {
    this.logger = new Logger(name);
  }

  abstract getSystemPrompt(): string;

  async execute(task: AgentTask): Promise<AgentResult> {
    this.logger.log(`Starting task: ${task.title} [mission: ${task.missionId}]`);
    await this.logAction(task.missionId, 'task_started', `Démarrage: ${task.title}`);

    // Load memory context
    const memContext = await this.memoryService.getRelevantContext(
      task.missionId,
      `${task.title} ${task.description}`
    );

    const messages: LLMMessage[] = [
      { role: 'system', content: this.buildSystemWithMemory(memContext) },
      ...this.conversationHistory,
      {
        role: 'user',
        content: this.buildTaskPrompt(task),
      },
    ];

    try {
      const response = await this.llmRouter.complete(messages, this.role);
      
      this.conversationHistory.push(
        { role: 'user', content: this.buildTaskPrompt(task) },
        { role: 'assistant', content: response.content }
      );

      // Keep history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-16);
      }

      const result = this.parseAgentOutput(task, response.content);

      // Store in memory
      await this.memoryService.storeAgentOutput(task.missionId, this.role, {
        task: task.title,
        output: result.output,
        artifacts: result.artifacts,
      });

      await this.logAction(task.missionId, 'task_completed', `Terminé: ${task.title}`, {
        provider: response.provider,
        tokens: response.tokens,
      });

      // Broadcast to frontend
      this.eventsGateway.broadcast('agent_update', {
        missionId: task.missionId,
        agent: this.name,
        role: this.role,
        action: 'task_completed',
        taskTitle: task.title,
      });

      return result;
    } catch (error) {
      this.logger.error(`Task failed: ${error.message}`);
      await this.logAction(task.missionId, 'task_failed', error.message);
      return {
        taskId: task.id,
        agentRole: this.role,
        output: '',
        success: false,
        error: error.message,
      };
    }
  }

  async sendMessage(toAgent: string, message: string, missionId: string): Promise<void> {
    await this.logAction(missionId, 'agent_message', message, { to: toAgent });
    this.eventsGateway.broadcast('agent_message', {
      missionId,
      from: this.name,
      to: toAgent,
      message,
    });
  }

  protected buildSystemWithMemory(memContext: string): string {
    const base = this.getSystemPrompt();
    if (!memContext) return base;
    return `${base}\n\n## Contexte mémoriel pertinent :\n${memContext}`;
  }

  protected buildTaskPrompt(task: AgentTask): string {
    return `
## Mission : ${task.missionId}
## Tâche : ${task.title}

${task.description}

${task.context ? `## Contexte additionnel :\n${JSON.stringify(task.context, null, 2)}` : ''}

Réponds en JSON avec ce format :
{
  "output": "ton analyse ou production principale",
  "artifacts": { "clé": "valeur" },
  "questionsForUser": ["question si info critique manquante"],
  "nextTasks": [{ "title": "...", "description": "...", "assignedRole": "..." }],
  "reasoning": "ton raisonnement interne"
}
    `.trim();
  }

  protected parseAgentOutput(task: AgentTask, raw: string): AgentResult {
    try {
      // Extract JSON even if wrapped in markdown
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          taskId: task.id,
          agentRole: this.role,
          output: parsed.output || raw,
          artifacts: parsed.artifacts,
          questionsForUser: parsed.questionsForUser,
          nextTasks: parsed.nextTasks,
          success: true,
        };
      }
    } catch (_) {}

    return {
      taskId: task.id,
      agentRole: this.role,
      output: raw,
      success: true,
    };
  }

  protected async logAction(
    missionId: string,
    action: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logsService.create({
      missionId,
      agent: this.name,
      action,
      message,
      metadata,
    });
  }

  resetHistory(): void {
    this.conversationHistory = [];
  }
}
