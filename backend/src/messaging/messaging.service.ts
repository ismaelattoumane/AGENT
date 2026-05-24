import { Injectable, Logger } from '@nestjs/common';
import { DiscordService } from './discord/discord.service';
import { TelegramService } from './telegram/telegram.service';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private discord: DiscordService,
    private telegram: TelegramService,
  ) {}

  async notifyAll(message: string): Promise<void> {
    await Promise.allSettled([
      this.discord.send(message),
      this.telegram.send(message),
    ]);
  }

  async askUser(missionId: string, question: string): Promise<void> {
    const msg = `❓ **Mission** \`${missionId.slice(0, 8)}\`\n\n${question}\n\nRépondez avec \`/answer ${missionId} votre_réponse\``;
    await this.notifyAll(msg);
  }

  async notifyMissionStarted(title: string, missionId: string): Promise<void> {
    await this.notifyAll(`🚀 Nouvelle mission lancée : **${title}**\nID: \`${missionId}\``);
  }
}
