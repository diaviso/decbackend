import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateForumCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
