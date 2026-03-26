import { Client } from '@elastic/elasticsearch';
import { LoggerService } from '@/utils/logger';

interface SearchOptions {
  index: string;
  query: string;
  fields?: string[];
  from?: number;
  size?: number;
  filters?: Record<string, any>;
}

export class SearchService {
  private client: Client;

  constructor() {
    if (process.env.ELASTICSEARCH_URL) {
      this.client = new Client({
        node: process.env.ELASTICSEARCH_URL,
        auth: process.env.ELASTICSEARCH_API_KEY
          ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
          : undefined,
      });
      LoggerService.info('Search service initialized');
    } else {
      LoggerService.warn('Search service not configured');
    }
  }

  async indexDocument(index: string, id: string, document: any): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.index({
        index,
        id,
        document,
      });
    } catch (error) {
      LoggerService.error('Failed to index document', error as Error);
      throw error;
    }
  }

  async search<T>(options: SearchOptions): Promise<{ items: T[]; total: number }> {
    if (!this.client) {
      return { items: [], total: 0 };
    }

    try {
      const { index, query, fields = ['*'], from = 0, size = 10, filters = {} } = options;

      const result = await this.client.search({
        index,
        from,
        size,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields,
                  fuzziness: 'AUTO',
                },
              },
            ],
            filter: Object.entries(filters).map(([key, value]) => ({
              term: { [key]: value },
            })),
          },
        },
      });

      const items = result.hits.hits.map(hit => hit._source as T);
      const total = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0;

      return { items, total };
    } catch (error) {
      LoggerService.error('Search failed', error as Error);
      return { items: [], total: 0 };
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.delete({
        index,
        id,
      });
    } catch (error) {
      LoggerService.error('Failed to delete document', error as Error);
    }
  }

  async bulkIndex(index: string, documents: Array<{ id: string; document: any }>): Promise<void> {
    if (!this.client) return;

    try {
      const operations = documents.flatMap(({ id, document }) => [
        { index: { _index: index, _id: id } },
        document,
      ]);

      await this.client.bulk({ operations });
    } catch (error) {
      LoggerService.error('Failed to bulk index documents', error as Error);
    }
  }
}

export const searchService = new SearchService();