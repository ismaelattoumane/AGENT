import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogEntity } from './log.entity';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LogEntity])],
  providers: [LogsService],
  controllers: [LogsController],
  exports: [LogsService],
})
export class LogsModule {}
