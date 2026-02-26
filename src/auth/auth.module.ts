import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { TokenCacheService } from './token-cache.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    TokenCacheService,
    AccessTokenGuard,
    RefreshTokenGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    TokenCacheService,
    AccessTokenGuard,
    RefreshTokenGuard,
  ],
})
export class AuthModule {}
