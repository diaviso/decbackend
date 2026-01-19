import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateForumCategoryDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
