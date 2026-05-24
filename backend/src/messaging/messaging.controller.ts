import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiscordService } from './discord/discord.service';
import { TelegramService } from './telegram/telegram.service';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private discord: DiscordService,
    private telegram: TelegramService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      discord: this.discord.isReady(),
      telegram: this.telegram.isReady(),
    };
  }
}
