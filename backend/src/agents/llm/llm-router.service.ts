import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export enum LLMProvider {
  CLAUDE = 'claude',
  GPT = 'gpt',
  GEMINI = 'gemini',
}

export enum AgentRole {
  PROJECT_MANAGER = 'project_manager',
  ANALYST = 'analyst',
  ARCHITECT = 'architect',
  BACKEND_DEV = 'backend_dev',
  FRONTEND_DEV = 'frontend_dev',
  DEVOPS = 'devops',
  QA = 'qa',
  WRITER = 'writer',
}

// Default LLM per agent role
const AGENT_LLM_MAP: Record<AgentRole, LLMProvider> = {
  [AgentRole.PROJECT_MANAGER]: LLMProvider.CLAUDE,   // Raisonnement complexe
  [AgentRole.ANALYST]: LLMProvider.GEMINI,            // Gros contextes
  [AgentRole.ARCHITECT]: LLMProvider.CLAUDE,          // Raisonnement complexe
  [AgentRole.BACKEND_DEV]: LLMProvider.GPT,           // Code
  [AgentRole.FRONTEND_DEV]: LLMProvider.GPT,          // Code
  [AgentRole.DEVOPS]: LLMProvider.GPT,                // Code + config
  [AgentRole.QA]: LLMProvider.GPT,                    // Code + analyse
  [AgentRole.WRITER]: LLMProvider.CLAUDE,             // Rédaction
};

const FALLBACK_ORDER: LLMProvider[] = [
  LLMProvider.CLAUDE,
  LLMProvider.GPT,
  LLMProvider.GEMINI,
];

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  tokens: { input: number; output: number };
}

@Injectable()
export class LLMRouterService {
  private readonly logger = new Logger(LLMRouterService.name);
  private anthropic: Anthropic;
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI;
  private providerHealth: Map<LLMProvider, boolean> = new Map();

  constructor(private config: ConfigService) {
    this.anthropic = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.gemini = new GoogleGenerativeAI(config.get('GEMINI_API_KEY'));

    // Init all providers as healthy
    Object.values(LLMProvider).forEach(p => this.providerHealth.set(p, true));
  }

  getPreferredProvider(role: AgentRole): LLMProvider {
    return AGENT_LLM_MAP[role] || LLMProvider.CLAUDE;
  }

  async complete(
    messages: LLMMessage[],
    role: AgentRole,
    options?: {
      provider?: LLMProvider;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<LLMResponse> {
    const preferred = options?.provider || this.getPreferredProvider(role);
    const order = this.buildFallbackOrder(preferred);

    for (const provider of order) {
      if (!this.providerHealth.get(provider)) continue;
      try {
        const result = await this.callProvider(provider, messages, options);
        this.providerHealth.set(provider, true);
        return result;
      } catch (err) {
        this.logger.warn(`Provider ${provider} failed: ${err.message}. Trying fallback...`);
        this.providerHealth.set(provider, false);
        // Auto-recover after 60s
        setTimeout(() => this.providerHealth.set(provider, true), 60_000);
      }
    }

    throw new Error('All LLM providers failed');
  }

  private buildFallbackOrder(preferred: LLMProvider): LLMProvider[] {
    return [preferred, ...FALLBACK_ORDER.filter(p => p !== preferred)];
  }

  private async callProvider(
    provider: LLMProvider,
    messages: LLMMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<LLMResponse> {
    const maxTokens = options?.maxTokens || 4096;
    const temperature = options?.temperature ?? 0.7;

    switch (provider) {
      case LLMProvider.CLAUDE:
        return this.callClaude(messages, maxTokens, temperature);
      case LLMProvider.GPT:
        return this.callGPT(messages, maxTokens, temperature);
      case LLMProvider.GEMINI:
        return this.callGemini(messages, maxTokens, temperature);
    }
  }

  private async callClaude(
    messages: LLMMessage[],
    maxTokens: number,
    temperature: number
  ): Promise<LLMResponse> {
    const system = messages.find(m => m.role === 'system')?.content || '';
    const conv = messages.filter(m => m.role !== 'system');

    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: maxTokens,
      temperature,
      system,
      messages: conv as any,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return {
      content,
      provider: LLMProvider.CLAUDE,
      model: response.model,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }

  private async callGPT(
    messages: LLMMessage[],
    maxTokens: number,
    temperature: number
  ): Promise<LLMResponse> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      temperature,
      messages: messages as any,
    });

    return {
      content: response.choices[0].message.content || '',
      provider: LLMProvider.GPT,
      model: response.model,
      tokens: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
    };
  }

  private async callGemini(
    messages: LLMMessage[],
    maxTokens: number,
    temperature: number
  ): Promise<LLMResponse> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    });

    const history = messages
      .filter(m => m.role !== 'system')
      .slice(0, -1)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMsg = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.content);

    return {
      content: result.response.text(),
      provider: LLMProvider.GEMINI,
      model: 'gemini-1.5-pro',
      tokens: { input: 0, output: 0 }, // Gemini doesn't always return token counts
    };
  }

  getProvidersStatus(): Record<LLMProvider, boolean> {
    return Object.fromEntries(this.providerHealth) as Record<LLMProvider, boolean>;
  }
}
