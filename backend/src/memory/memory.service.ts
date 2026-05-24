import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { AgentRole } from '../agents/llm/llm-router.service';

const COLLECTION_NAME = 'agent_memory';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);
  private qdrant: QdrantClient;

  constructor(private config: ConfigService) {
    this.qdrant = new QdrantClient({
      url: config.get('QDRANT_URL', 'http://localhost:6333'),
      apiKey: config.get('QDRANT_API_KEY'),
    });
  }

  async onModuleInit() {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
      if (!exists) {
        await this.qdrant.createCollection(COLLECTION_NAME, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        this.logger.log(`Collection ${COLLECTION_NAME} created`);
      }
    } catch (err) {
      this.logger.warn(`Qdrant init error: ${err.message}`);
    }
  }

  async storeAgentOutput(
    missionId: string,
    role: AgentRole,
    data: { task: string; output: string; artifacts?: any }
  ): Promise<void> {
    try {
      // Simple embedding placeholder - in production replace with real embeddings
      const vector = new Array(VECTOR_SIZE).fill(0).map(() => Math.random() * 0.01);
      
      await this.qdrant.upsert(COLLECTION_NAME, {
        points: [{
          id: Date.now(),
          vector,
          payload: {
            missionId,
            role,
            task: data.task,
            output: data.output.substring(0, 2000),
            artifacts: data.artifacts ? JSON.stringify(data.artifacts) : null,
            timestamp: new Date().toISOString(),
          },
        }],
      });
    } catch (err) {
      this.logger.warn(`Memory store failed: ${err.message}`);
    }
  }

  async getRelevantContext(missionId: string, query: string): Promise<string> {
    try {
      const vector = new Array(VECTOR_SIZE).fill(0).map(() => Math.random() * 0.01);

      const results = await this.qdrant.search(COLLECTION_NAME, {
        vector,
        limit: 5,
        filter: {
          must: [{ key: 'missionId', match: { value: missionId } }],
        },
      });

      if (!results.length) return '';

      return results
        .map(r => `[${r.payload.role}] ${r.payload.task}: ${r.payload.output}`)
        .join('\n---\n');
    } catch (err) {
      this.logger.warn(`Memory retrieval failed: ${err.message}`);
      return '';
    }
  }

  async clearMissionMemory(missionId: string): Promise<void> {
    try {
      await this.qdrant.delete(COLLECTION_NAME, {
        filter: {
          must: [{ key: 'missionId', match: { value: missionId } }],
        },
      });
    } catch (err) {
      this.logger.warn(`Memory clear failed: ${err.message}`);
    }
  }
}
