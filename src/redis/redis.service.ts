import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    const payload = JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, payload, 'EX', ttlSeconds);
      return;
    }

    await this.redis.set(key, payload);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async del(key: string) {
    await this.redis.del(key);
  }
}
