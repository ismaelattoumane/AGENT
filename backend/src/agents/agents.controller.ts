import { Controller, Get, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LLMRouterService } from './llm/llm-router.service';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(
    private agentsService: AgentsService,
    private llmRouter: LLMRouterService,
  ) {}

  @Get()
  getAgents() {
    return this.agentsService.getAllAgents();
  }

  @Get('llm-status')
  getLLMStatus() {
    return this.llmRouter.getProvidersStatus();
  }
}
