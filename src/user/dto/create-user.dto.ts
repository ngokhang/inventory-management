import { Role } from 'prisma/generated/enums';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  avatarUrl?: string;
}
