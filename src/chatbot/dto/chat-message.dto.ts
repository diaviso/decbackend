import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @IsOptional()
  conversationHistory?: Array<{ role: string; content: string }>;
}
