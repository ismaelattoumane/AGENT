import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { DiscordService } from './discord/discord.service';
import { TelegramService } from './telegram/telegram.service';
import { MessagingController } from './messaging.controller';

@Module({
  providers: [MessagingService, DiscordService, TelegramService],
  controllers: [MessagingController],
  exports: [MessagingService, DiscordService, TelegramService],
})
export class MessagingModule {}
