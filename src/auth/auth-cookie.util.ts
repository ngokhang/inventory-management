import { Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  ONE_DAY_IN_MS,
  REFRESH_TOKEN_COOKIE,
} from '../common/constants/cookie.constant';

function buildCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: ONE_DAY_IN_MS,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  const options = buildCookieOptions();

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, options);
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, options);
}

export function clearAuthCookies(res: Response) {
  const options = buildCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
