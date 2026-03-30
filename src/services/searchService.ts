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

async searchUsers(query: string, filters?: any): Promise<{ items: any[]; total: number }> {
    const must = [];
    
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'email^2', 'bio'],
          fuzziness: 'AUTO',
        },
      });
    }
    
    if (filters?.role) {
      must.push({ term: { role: filters.role } });
    }
    
    if (filters?.isActive !== undefined) {
      must.push({ term: { isActive: filters.isActive } });
    }
    
    const result = await this.client.search({
      index: 'users',
      body: {
        query: { bool: { must } },
        highlight: {
          fields: {
            name: {},
            email: {},
            bio: {},
          },
        },
        suggest: {
          name_suggest: {
            prefix: query,
            completion: {
              field: 'name_suggest',
              fuzzy: { fuzziness: 1 },
            },
          },
        },
      },
    });
    
    return {
      items: result.hits.hits.map(hit => hit._source),
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
    };
  }

async reindexAll() {
    const UserModel = (await import('../models/user.model')).UserModel;
    const users = await UserModel.find({ isDeleted: false });
    const operations = users.flatMap(user => [
      { index: { _index: 'users', _id: user._id.toString() } },
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        name_suggest: {
          input: user.name.split(' '),
          weight: user.role === 'admin' ? 10 : 1,
        },
      },
    ]);
    
    await this.client.bulk({ body: operations });
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