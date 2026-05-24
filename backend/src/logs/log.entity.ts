import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { MissionEntity } from '../missions/mission.entity';

@Entity('logs')
export class LogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  missionId: string;

  @Column()
  agent: string;

  @Column()
  action: string;

  @Column('text')
  message: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => MissionEntity, mission => mission.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'missionId' })
  mission: MissionEntity;

  @CreateDateColumn()
  timestamp: Date;
}
