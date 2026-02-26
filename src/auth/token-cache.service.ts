import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { Role } from 'prisma/generated/enums';

interface SessionCache {
  userId: string;
  accountId: string;
  role: Role;
  refreshTokenHash: string;
}

@Injectable()
export class TokenCacheService {
  private readonly ttlSeconds = 24 * 60 * 60;

  constructor(private readonly redisService: RedisService) {}

  private sessionKey(sessionId: string) {
    return `auth:session:${sessionId}`;
  }

  async createSession(
    sessionId: string,
    userId: string,
    accountId: string,
    role: Role,
    refreshToken: string,
  ) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const payload: SessionCache = {
      userId,
      accountId,
      role,
      refreshTokenHash,
    };

    await this.redisService.setJson(
      this.sessionKey(sessionId),
      payload,
      this.ttlSeconds,
    );
  }

  async getSession(sessionId: string) {
    return this.redisService.getJson<SessionCache>(this.sessionKey(sessionId));
  }

  async validateRefreshToken(sessionId: string, refreshToken: string) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const isValid = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );
    if (!isValid) {
      return null;
    }

    return session;
  }

  async revokeSession(sessionId: string) {
    await this.redisService.del(this.sessionKey(sessionId));
  }
}
