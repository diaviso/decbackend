import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateForumCommentDto {
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  parentCommentId?: string;
}
