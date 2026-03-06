import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Role } from 'prisma/generated/enums';

export class CreateMenuItemDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsString()
  @Length(1, 255)
  menuId: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  href?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  parentId?: string;

  @IsArray()
  @IsEnum(Role, { each: true })
  requiredRoles: Role[];

  @IsBoolean()
  isActive: boolean;

  @IsNumber()
  @Min(0)
  @Max(50)
  sortOrder: number;
}
