import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentsModule } from './agents/agents.module';
import { MissionsModule } from './missions/missions.module';
import { TasksModule } from './tasks/tasks.module';
import { LogsModule } from './logs/logs.module';
import { MemoryModule } from './memory/memory.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EventsGateway } from './events/events.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    DatabaseModule,
    AuthModule,
    AgentsModule,
    MissionsModule,
    TasksModule,
    LogsModule,
    MemoryModule,
    OrchestrationModule,
    MessagingModule,
  ],
  providers: [EventsGateway],
})
export class AppModule {}
