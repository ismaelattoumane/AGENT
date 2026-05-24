import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './task.entity';

@Injectable()
export class TasksService {
  constructor(@InjectRepository(TaskEntity) private repo: Repository<TaskEntity>) {}

  findByMission(missionId: string) {
    return this.repo.find({ where: { missionId }, order: { createdAt: 'ASC' } });
  }
}
