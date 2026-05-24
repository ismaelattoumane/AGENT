import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { TaskEntity } from '../../tasks/task.entity';
import { LogEntity } from '../../logs/log.entity';

export enum MissionStatus {
  WAITING    = 'waiting',
  IN_PROGRESS = 'in_progress',
  BLOCKED    = 'blocked',
  USER_INPUT = 'user_input',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
}

export enum MissionPriority {
  LOW    = 'low',
  MEDIUM = 'medium',
  HIGH   = 'high',
  URGENT = 'urgent',
}

@Entity('missions')
export class MissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'enum', enum: MissionPriority, default: MissionPriority.MEDIUM })
  priority: MissionPriority;

  @Column({ type: 'enum', enum: MissionStatus, default: MissionStatus.WAITING })
  status: MissionStatus;

  @Column('jsonb', { nullable: true })
  plan: Record<string, any>;

  @Column('jsonb', { nullable: true })
  constraints: Record<string, any>;

  @Column('jsonb', { nullable: true })
  userAnswers: Record<string, any>;

  @Column({ nullable: true })
  userId: string;

  @OneToMany(() => TaskEntity, task => task.mission, { cascade: true })
  tasks: TaskEntity[];

  @OneToMany(() => LogEntity, log => log.mission)
  logs: LogEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
