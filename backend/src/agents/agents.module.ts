import { Module } from '@nestjs/common';
import { LLMRouterService } from './llm/llm-router.service';
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
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { LogsModule } from '../logs/logs.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [LogsModule, MemoryModule],
  providers: [
    LLMRouterService,
    ProjectManagerAgent,
    AnalystAgent,
    ArchitectAgent,
    BackendDevAgent,
    FrontendDevAgent,
    DevOpsAgent,
    QAAgent,
    WriterAgent,
    AgentsService,
  ],
  controllers: [AgentsController],
  exports: [
    LLMRouterService,
    AgentsService,
    ProjectManagerAgent,
    AnalystAgent,
    ArchitectAgent,
    BackendDevAgent,
    FrontendDevAgent,
    DevOpsAgent,
    QAAgent,
    WriterAgent,
  ],
})
export class AgentsModule {}
