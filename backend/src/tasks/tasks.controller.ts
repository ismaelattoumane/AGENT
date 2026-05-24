import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private service: TasksService) {}

  @Get('mission/:missionId')
  findByMission(@Param('missionId') missionId: string) {
    return this.service.findByMission(missionId);
  }
}
