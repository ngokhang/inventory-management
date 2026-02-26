import { Role } from 'prisma/generated/enums';

export enum Permission {
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
  ],
  USER: [Permission.USER_READ],
  CUSTOMER: [Permission.USER_READ],
};
