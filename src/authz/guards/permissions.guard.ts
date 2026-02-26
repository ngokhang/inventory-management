import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, ROLE_PERMISSIONS } from '../constants/permission.constant';
import { Role } from 'prisma/generated/enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: Role };

    if (!user?.role) {
      return false;
    }

    const rolePermissions = await this.getRolePermissions(user.role);

    return requiredPermissions.every((permission) =>
      rolePermissions.includes(permission),
    );
  }

  private async getRolePermissions(role: Role): Promise<Permission[]> {
    const cacheKey = `auth:role_permissions:${role}`;
    const cached = await this.redisService.getJson<Permission[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const permissions = ROLE_PERMISSIONS[role] ?? [];
    await this.redisService.setJson(cacheKey, permissions, 60 * 60);

    return permissions;
  }
}
