import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { MissionEntity } from '../missions/mission.entity';
import { AgentRole } from '../agents/llm/llm-router.service';

export enum TaskStatus {
  PENDING    = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED  = 'completed',
  FAILED     = 'failed',
  SKIPPED    = 'skipped',
}

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  missionId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'enum', enum: AgentRole })
  assignedRole: AgentRole;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column('jsonb', { nullable: true })
  context: Record<string, any>;

  @Column('simple-array', { nullable: true })
  dependencies: string[];

  @Column('text', { nullable: true })
  output: string;

  @Column('jsonb', { nullable: true })
  artifacts: Record<string, any>;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  error: string;

  @ManyToOne(() => MissionEntity, mission => mission.tasks)
  @JoinColumn({ name: 'missionId' })
  mission: MissionEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
