import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { randomUUID } from 'crypto';
import { TokenCacheService } from './token-cache.service';
import { Provider } from 'prisma/generated/enums';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn = '1d';
  private readonly refreshTokenExpiresIn = '1d';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenCacheService: TokenCacheService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          provider: Provider.LOCAL,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.name,
          accountId: account.id,
          role: dto.role,
          avatarUrl: dto.avatarUrl,
        },
        select: {
          id: true,
          name: true,
          role: true,
          avatarUrl: true,
          accountId: true,
        },
      });

      return {
        account: {
          id: account.id,
          username: account.username,
          email: account.email,
          provider: account.provider,
        },
        user,
      };
    });
  }

  async login(dto: LoginDto) {
    const account = await this.prisma.account.findFirst({
      where: {
        OR: [{ username: dto.login }, { email: dto.login }],
      },
      include: {
        user: true,
      },
    });

    if (!account || !account.user) {
      throw new NotFoundException('Account or user not found');
    }

    const isValid = await bcrypt.compare(dto.password, account.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = randomUUID();
    const tokens = await this.createTokenPair(
      account.user.id,
      account.id,
      account.user.role,
      sessionId,
    );

    await this.tokenCacheService.createSession(
      sessionId,
      account.user.id,
      account.id,
      account.user.role,
      tokens.refreshToken,
    );

    return {
      tokens,
      user: {
        id: account.user.id,
        name: account.user.name,
        role: account.user.role,
        avatarUrl: account.user.avatarUrl,
      },
    };
  }

  async refresh(payload: JwtPayload & { refreshToken: string }) {
    const session = await this.tokenCacheService.validateRefreshToken(
      payload.sid,
      payload.refreshToken,
    );

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const tokens = await this.createTokenPair(
      session.userId,
      session.accountId,
      session.role,
      payload.sid,
    );

    await this.tokenCacheService.createSession(
      payload.sid,
      session.userId,
      session.accountId,
      session.role,
      tokens.refreshToken,
    );

    return { tokens };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        account: {
          select: {
            id: true,
            username: true,
            email: true,
            provider: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async logout(sessionId: string) {
    await this.tokenCacheService.revokeSession(sessionId);
  }

  private async createTokenPair(
    userId: string,
    accountId: string,
    role: JwtPayload['role'],
    sid: string,
  ) {
    const accessPayload: JwtPayload = {
      sub: userId,
      accountId,
      role,
      sid,
      tokenType: 'access',
    };

    const refreshPayload: JwtPayload = {
      ...accessPayload,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: process.env.JWT_AT_SECRET ?? 'access-secret',
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: process.env.JWT_RT_SECRET ?? 'refresh-secret',
        expiresIn: this.refreshTokenExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
