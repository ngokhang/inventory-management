import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { clearAuthCookies, setAuthCookies } from './auth-cookie.util';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { AccessTokenGuard } from './guards/access-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return {
      message: 'Login successful',
      user: result.user,
    };
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @CurrentUser() payload: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(payload);

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return {
      message: 'Token refreshed',
    };
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  async logout(
    @CurrentUser() user: { sid: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sid);
    clearAuthCookies(res);

    return {
      message: 'Logout successful',
    };
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async me(@CurrentUser() user: { userId: string }) {
    return this.authService.me(user.userId);
  }
}
