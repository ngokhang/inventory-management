import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(1, 120)
  login!: string;

  @IsString()
  @Length(6, 128)
  password!: string;
}
