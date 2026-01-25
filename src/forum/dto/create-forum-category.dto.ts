import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateForumCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
