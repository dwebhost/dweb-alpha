import { IsOptional, IsNumberString } from 'class-validator';

export class QueryContentHashDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
