import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL')?.trim();
    const redisHost = config.get<string>('REDIS_HOST')?.trim();
    const redisTls = config.get<string>('REDIS_TLS') === 'true';

    const commonOptions = {
      lazyConnect: true,
      connectTimeout: 10_000,
      retryStrategy: (attempt: number) => {
        const delay = Math.min(250 * 2 ** Math.min(attempt - 1, 5), 5_000);
        this.logger.warn(`Redis reconnect attempt ${attempt} in ${delay}ms`);
        return delay;
      },
    };

    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);
      if (parsedUrl.protocol !== 'redis:' && parsedUrl.protocol !== 'rediss:') {
        throw new Error('REDIS_URL must use the redis: or rediss: protocol');
      }
      this.client = new Redis(redisUrl, {
        ...commonOptions,
        tls:
          parsedUrl.protocol === 'rediss:' ||
          redisTls ||
          parsedUrl.hostname.toLowerCase().endsWith('.upstash.io')
            ? {}
            : undefined,
      });
    } else {
      const port = config.getOrThrow<number>('REDIS_PORT');
      if (!redisHost) {
        throw new Error('REDIS_HOST must not be empty');
      }

      this.client = new Redis({
        host: redisHost,
        port,
        password: config.get<string>('REDIS_PASSWORD'),
        username: config.get<string>('REDIS_USERNAME'),
        tls:
          redisTls || redisHost.toLowerCase().endsWith('.upstash.io')
            ? {}
            : undefined,
        ...commonOptions,
      });
    }

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis client error: ${error.message}`, error.stack);
    });
  }

  onModuleInit(): void {
    this.client.on('ready', () => this.logger.log('Connected to Redis'));
    this.client.on('reconnecting', (delay: number) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
    void this.client.connect().catch((error: unknown) => {
      this.logger.warn(
        `Initial Redis connection failed; reconnecting in the background: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  async get<T>(key: string): Promise<T | undefined> {
    this.validateKey(key);

    const value = await this.client.get(key);
    if (value === null) {
      return undefined;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(`Cached value for key "${key}" is not valid JSON`, {
        cause: error,
      });
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.validateKey(key);

    if (ttl !== undefined && (!Number.isFinite(ttl) || ttl < 0)) {
      throw new RangeError(
        'Cache TTL must be a non-negative number of milliseconds',
      );
    }

    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new TypeError('Cache value must be JSON-serializable');
    }

    if (ttl === undefined || ttl === 0) {
      await this.client.set(key, serialized);
      return;
    }

    await this.client.set(key, serialized, 'PX', Math.ceil(ttl));
  }

  async del(key: string): Promise<boolean> {
    this.validateKey(key);
    return (await this.client.del(key)) > 0;
  }

  private validateKey(key: string): void {
    if (!key.trim()) {
      throw new TypeError('Cache key must not be empty');
    }
  }
}