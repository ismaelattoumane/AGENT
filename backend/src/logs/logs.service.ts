import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntity } from './log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogEntity)
    private repo: Repository<LogEntity>,
  ) {}

  async create(data: {
    missionId: string;
    agent: string;
    action: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<LogEntity> {
    const log = this.repo.create(data);
    return this.repo.save(log);
  }

  async findByMission(missionId: string, limit = 100): Promise<LogEntity[]> {
    return this.repo.find({
      where: { missionId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findAll(limit = 200): Promise<LogEntity[]> {
    return this.repo.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
