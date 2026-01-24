import { Module, forwardRef } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [forwardRef(() => DocumentsModule)],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
