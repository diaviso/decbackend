import { IsNotEmpty, IsString } from 'class-validator';

export class CreateForumCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
