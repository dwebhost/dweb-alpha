import {
  IsOptional,
  IsNumberString,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class QueryContentHashDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class QueryContentHashByNodeDto extends QueryContentHashDto {
  @IsString()
  @IsNotEmpty()
  node: string;
}
