import {
  IsString,
  IsOptional,
  Length,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Role } from 'prisma/generated/enums';

export class CreateMenuDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;

  @IsArray()
  @IsEnum(Role, { each: true })
  requiredRoles: Role[];

  @IsString()
  @Length(1, 50)
  position: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  iconUrl?: string;

  @IsBoolean()
  isActive: boolean;
}
