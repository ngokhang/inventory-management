import { Role } from 'prisma/generated/enums';

export interface JwtPayload {
  sub: string;
  accountId: string;
  role: Role;
  sid: string;
  tokenType: 'access' | 'refresh';
}
