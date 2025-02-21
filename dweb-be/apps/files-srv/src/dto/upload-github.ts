import { IsNotEmpty, IsString } from 'class-validator';

export class UploadGithub {
  @IsString()
  @IsNotEmpty()
  url: string;
}
