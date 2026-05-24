import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, Interaction, TextChannel,
} from 'discord.js';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;
  private notifyChannelId: string;
  private missionsService: any; // Injected lazily to avoid circular deps

  constructor(private config: ConfigService) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });
  }

  setMissionsService(service: any) {
    this.missionsService = service;
  }

  async onModuleInit() {
    const token = this.config.get('DISCORD_BOT_TOKEN');
    if (!token) {
      this.logger.warn('Discord bot token not configured');
      return;
    }

    this.client.once('ready', async () => {
      this.logger.log(`Discord bot ready: ${this.client.user?.tag}`);
      await this.registerSlashCommands();
    });

    this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction));

    await this.client.login(token);
  }

  private async registerSlashCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('status')
        .setDescription('État des missions')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('tasks')
        .setDescription('Tâches d\'une mission')
        .addStringOption(o => o.setName('mission_id').setDescription('ID mission').setRequired(true))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('history')
        .setDescription('Historique des logs')
        .addStringOption(o => o.setName('mission_id').setDescription('ID mission').setRequired(true))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('answer')
        .setDescription('Répondre à une question agent')
        .addStringOption(o => o.setName('mission_id').setDescription('ID mission').setRequired(true))
        .addStringOption(o => o.setName('answer').setDescription('Votre réponse').setRequired(true))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Annuler une mission')
        .addStringOption(o => o.setName('mission_id').setDescription('ID mission').setRequired(true))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('new')
        .setDescription('Créer une nouvelle mission')
        .addStringOption(o => o.setName('title').setDescription('Titre').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true))
        .toJSON(),
    ];

    const rest = new REST().setToken(this.config.get('DISCORD_BOT_TOKEN'));
    const clientId = this.config.get('DISCORD_CLIENT_ID');
    const guildId = this.config.get('DISCORD_GUILD_ID');

    try {
      await rest.put(
        guildId
          ? Routes.applicationGuildCommands(clientId, guildId)
          : Routes.applicationCommands(clientId),
        { body: commands }
      );
      this.logger.log('Discord slash commands registered');
    } catch (err) {
      this.logger.error(`Command registration failed: ${err.message}`);
    }
  }

  private async handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (!this.missionsService) return;

    const { commandName } = interaction;
    await interaction.deferReply();

    try {
      switch (commandName) {
        case 'status': {
          const missions = await this.missionsService.findAll();
          const lines = missions.slice(0, 10).map(m =>
            `• **${m.title}** — ${m.status} (${m.id.slice(0, 8)})`
          );
          await interaction.editReply(lines.join('\n') || 'Aucune mission');
          break;
        }
        case 'answer': {
          const id = interaction.options.getString('mission_id');
          const answer = interaction.options.getString('answer');
          await this.missionsService.answerQuestion(id, answer);
          await interaction.editReply(`✅ Réponse enregistrée pour mission \`${id}\``);
          break;
        }
        case 'cancel': {
          const id = interaction.options.getString('mission_id');
          await this.missionsService.cancel(id);
          await interaction.editReply(`❌ Mission \`${id}\` annulée`);
          break;
        }
        case 'new': {
          const title = interaction.options.getString('title');
          const description = interaction.options.getString('description');
          const mission = await this.missionsService.create({ title, description });
          await interaction.editReply(`🚀 Mission créée: **${mission.title}** (\`${mission.id}\`)`);
          break;
        }
        default:
          await interaction.editReply('Commande non reconnue');
      }
    } catch (err) {
      await interaction.editReply(`Erreur: ${err.message}`);
    }
  }

  async send(message: string): Promise<void> {
    if (!this.notifyChannelId) {
      // Find first text channel
      const guild = this.client.guilds.cache.first();
      const channel = guild?.channels.cache.find(
        c => c.isTextBased() && c.name.includes('general')
      ) as TextChannel;
      if (channel) this.notifyChannelId = channel.id;
    }

    if (this.notifyChannelId) {
      const channel = await this.client.channels.fetch(this.notifyChannelId) as TextChannel;
      await channel?.send(message);
    }
  }

  isReady(): boolean {
    return this.client.isReady();
  }
}
