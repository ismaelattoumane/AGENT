import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context } from 'grammy';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot;
  private chatIds: Set<number> = new Set();
  private missionsService: any;

  constructor(private config: ConfigService) {}

  setMissionsService(service: any) {
    this.missionsService = service;
  }

  async onModuleInit() {
    const token = this.config.get('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('Telegram bot token not configured');
      return;
    }

    this.bot = new Bot(token);
    this.registerCommands();

    this.bot.start().catch(err =>
      this.logger.error(`Telegram bot error: ${err.message}`)
    );

    this.logger.log('Telegram bot started');
  }

  private registerCommands() {
    this.bot.command('start', ctx => {
      this.chatIds.add(ctx.chat.id);
      ctx.reply('✅ Connecté au système multi-agents.\nCommandes: /status /answer /cancel /new');
    });

    this.bot.command('status', async ctx => {
      if (!this.missionsService) return;
      const missions = await this.missionsService.findAll();
      const lines = missions.slice(0, 10).map(m =>
        `• ${m.title} — ${m.status}`
      );
      ctx.reply(lines.join('\n') || 'Aucune mission');
    });

    this.bot.command('answer', async ctx => {
      // Format: /answer <mission_id> <answer>
      const parts = ctx.message?.text?.split(' ');
      if (!parts || parts.length < 3) {
        return ctx.reply('Usage: /answer <mission_id> <votre_réponse>');
      }
      const [, missionId, ...answerParts] = parts;
      const answer = answerParts.join(' ');
      await this.missionsService?.answerQuestion(missionId, answer);
      ctx.reply(`✅ Réponse enregistrée`);
    });

    this.bot.command('cancel', async ctx => {
      const parts = ctx.message?.text?.split(' ');
      if (!parts?.[1]) return ctx.reply('Usage: /cancel <mission_id>');
      await this.missionsService?.cancel(parts[1]);
      ctx.reply(`❌ Mission annulée`);
    });

    this.bot.command('new', async ctx => {
      const text = ctx.message?.text?.replace('/new ', '');
      if (!text) return ctx.reply('Usage: /new Titre | Description');
      const [title, ...descParts] = text.split('|');
      const description = descParts.join('|').trim() || title;
      const mission = await this.missionsService?.create({ title: title.trim(), description });
      ctx.reply(`🚀 Mission créée: ${mission?.title}`);
    });

    // Track all messages to collect chat IDs
    this.bot.on('message', ctx => {
      this.chatIds.add(ctx.chat.id);
    });
  }

  async send(message: string): Promise<void> {
    if (!this.bot || this.chatIds.size === 0) return;
    
    // Strip markdown for Telegram
    const text = message.replace(/\*\*/g, '*');
    
    for (const chatId of this.chatIds) {
      try {
        await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      } catch (err) {
        this.logger.warn(`Telegram send failed for ${chatId}: ${err.message}`);
        this.chatIds.delete(chatId);
      }
    }
  }

  isReady(): boolean {
    return !!this.bot;
  }
}
