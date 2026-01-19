import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('stream')
  @UseGuards(JwtAuthGuard)
  async chatStream(
    @Body() chatMessageDto: ChatMessageDto,
    @Res() res: Response,
  ) {
    return this.chatbotService.chatStream(chatMessageDto, res);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() chatMessageDto: ChatMessageDto) {
    return this.chatbotService.chat(chatMessageDto);
  }
}
