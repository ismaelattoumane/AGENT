import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionEntity, MissionStatus, MissionPriority } from './mission.entity';
import { OrchestrationService } from '../orchestration/orchestration.service';

export interface CreateMissionDto {
  title: string;
  description: string;
  priority?: MissionPriority;
  constraints?: Record<string, any>;
  userId?: string;
}

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(MissionEntity)
    private repo: Repository<MissionEntity>,
    private orchestration: OrchestrationService,
  ) {}

  async create(dto: CreateMissionDto): Promise<MissionEntity> {
    const mission = this.repo.create({
      ...dto,
      status: MissionStatus.WAITING,
    });
    const saved = await this.repo.save(mission);

    // Auto-start
    await this.orchestration.startMission(saved.id);
    return saved;
  }

  async findAll(): Promise<MissionEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<MissionEntity> {
    const mission = await this.repo.findOne({ where: { id }, relations: ['tasks', 'logs'] });
    if (!mission) throw new NotFoundException(`Mission ${id} not found`);
    return mission;
  }

  async update(id: string, description: string): Promise<void> {
    await this.orchestration.updateMission(id, description);
  }

  async cancel(id: string): Promise<MissionEntity> {
    const mission = await this.findOne(id);
    mission.status = MissionStatus.CANCELLED;
    return this.repo.save(mission);
  }

  async answerQuestion(missionId: string, answer: string): Promise<void> {
    await this.orchestration.answerUserQuestion(missionId, answer);
  }

  async getStatus(id: string) {
    const mission = await this.findOne(id);
    const workflowState = this.orchestration.getWorkflowState(id);
    return {
      mission,
      workflowNode: workflowState?.currentNode,
      taskCount: mission.tasks?.length || 0,
      completedTasks: mission.tasks?.filter(t => t.status === 'completed').length || 0,
      pendingQuestions: workflowState?.pendingUserQuestions || [],
    };
  }
}
