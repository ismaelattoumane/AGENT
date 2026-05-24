import { Injectable, Logger } from '@nestjs/common';
import { AgentRole } from './llm/llm-router.service';
import { BaseAgent, AgentTask, AgentResult } from './base-agent';
import {
  ProjectManagerAgent,
  AnalystAgent,
  ArchitectAgent,
  BackendDevAgent,
  FrontendDevAgent,
  DevOpsAgent,
  QAAgent,
  WriterAgent,
} from './specialized/all-agents';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly registry: Map<AgentRole, BaseAgent>;

  constructor(
    private pm: ProjectManagerAgent,
    private analyst: AnalystAgent,
    private architect: ArchitectAgent,
    private backendDev: BackendDevAgent,
    private frontendDev: FrontendDevAgent,
    private devops: DevOpsAgent,
    private qa: QAAgent,
    private writer: WriterAgent,
  ) {
    this.registry = new Map([
      [AgentRole.PROJECT_MANAGER, pm],
      [AgentRole.ANALYST, analyst],
      [AgentRole.ARCHITECT, architect],
      [AgentRole.BACKEND_DEV, backendDev],
      [AgentRole.FRONTEND_DEV, frontendDev],
      [AgentRole.DEVOPS, devops],
      [AgentRole.QA, qa],
      [AgentRole.WRITER, writer],
    ]);
  }

  getAgent(role: AgentRole): BaseAgent {
    const agent = this.registry.get(role);
    if (!agent) throw new Error(`Agent not found: ${role}`);
    return agent;
  }

  async dispatch(role: AgentRole, task: AgentTask): Promise<AgentResult> {
    const agent = this.getAgent(role);
    this.logger.log(`Dispatching task "${task.title}" to ${agent.name}`);
    return agent.execute(task);
  }

  getAllAgents(): { role: AgentRole; name: string }[] {
    return Array.from(this.registry.entries()).map(([role, agent]) => ({
      role,
      name: agent.name,
    }));
  }
}
