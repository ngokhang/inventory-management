import { Role } from 'prisma/generated/enums';
import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(1, 64)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 128)
  password!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  avatarUrl?: string;
}
