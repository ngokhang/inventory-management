import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../../common/constants/cookie.constant';
import { JwtPayload } from '../types/jwt-payload.type';
import { TokenCacheService } from '../token-cache.service';

function readCookie(req: Request, key: string): unknown {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  return cookies?.[key];
}

function extractAccessToken(req: Request): string | null {
  const token = readCookie(req, ACCESS_TOKEN_COOKIE);
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(private readonly tokenCacheService: TokenCacheService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractAccessToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_AT_SECRET ?? 'access-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const session = await this.tokenCacheService.getSession(payload.sid);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return {
      userId: payload.sub,
      accountId: payload.accountId,
      role: payload.role,
      sid: payload.sid,
    };
  }
}
