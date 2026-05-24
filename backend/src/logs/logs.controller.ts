import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get()
  findAll(@Query('limit') limit?: number) {
    return this.logsService.findAll(limit);
  }

  @Get('mission/:missionId')
  findByMission(@Param('missionId') missionId: string, @Query('limit') limit?: number) {
    return this.logsService.findByMission(missionId, limit);
  }
}
