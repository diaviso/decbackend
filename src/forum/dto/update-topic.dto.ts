import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum TopicStatus {
  OUVERT = 'OUVERT',
  FERME = 'FERME',
  RESOLU = 'RESOLU',
}

export class UpdateTopicDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(TopicStatus)
  @IsOptional()
  status?: TopicStatus;
}
