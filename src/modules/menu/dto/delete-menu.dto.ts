import { IsArray, IsString } from 'class-validator';

export class DeleteMenuDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[] = [];
}
