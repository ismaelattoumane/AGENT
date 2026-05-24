import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrchestrationService } from './orchestration.service';
import { MissionEntity } from '../missions/mission.entity';
import { TaskEntity } from '../tasks/task.entity';
import { AgentsModule } from '../agents/agents.module';
import { LogsModule } from '../logs/logs.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MissionEntity, TaskEntity]),
    AgentsModule,
    LogsModule,
    MessagingModule,
  ],
  providers: [OrchestrationService],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
