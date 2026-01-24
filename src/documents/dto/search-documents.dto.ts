import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDocumentsDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
