import { IsNotEmpty, IsString } from 'class-validator';

export class UploadGithub {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsNotEmpty()
  @IsString()
  branch: string;

  @IsString()
  envJson: string;
}
