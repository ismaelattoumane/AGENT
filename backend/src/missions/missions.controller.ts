import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { MissionsService, CreateMissionDto } from './missions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  constructor(private service: MissionsService) {}

  @Post()
  create(@Body() dto: CreateMissionDto, @Request() req) {
    return this.service.create({ ...dto, userId: req.user.id });
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.service.getStatus(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body('description') description: string) {
    return this.service.update(id, description);
  }

  @Post(':id/answer')
  answerQuestion(@Param('id') id: string, @Body('answer') answer: string) {
    return this.service.answerQuestion(id, answer);
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
