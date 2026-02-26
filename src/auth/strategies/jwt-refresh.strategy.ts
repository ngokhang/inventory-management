import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';
import { REFRESH_TOKEN_COOKIE } from '../../common/constants/cookie.constant';

function extractRefreshToken(req: Request): string | null {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractRefreshToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_RT_SECRET ?? 'refresh-secret',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!refreshToken || payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}
