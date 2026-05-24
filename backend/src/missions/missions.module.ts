import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionEntity } from './mission.entity';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MissionEntity]),
    forwardRef(() => OrchestrationModule),
  ],
  providers: [MissionsService],
  controllers: [MissionsController],
  exports: [MissionsService],
})
export class MissionsModule {}
