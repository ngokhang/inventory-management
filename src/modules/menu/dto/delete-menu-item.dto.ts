import { IsArray, IsString } from 'class-validator';

export class DeleteMenuItemDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[] = [];
}
