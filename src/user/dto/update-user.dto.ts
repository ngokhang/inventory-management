import { Role } from 'prisma/generated/enums';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  avatarUrl?: string;
}
