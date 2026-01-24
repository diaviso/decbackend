import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatMessageDto } from './dto/chat-message.dto';
import { Response } from 'express';
import { RagService } from '../documents/rag.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private chatModel: ChatOpenAI;

  private readonly systemPrompt = `tu es assitant, répond aux questions en utilisant le contexte qui t'est fournie`;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => RagService))
    private ragService: RagService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not configured');
    }

    this.chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
    });
  }

  private buildMessages(chatMessageDto: ChatMessageDto, ragContext: string = ''): BaseMessage[] {
    // Build system prompt with RAG context if available
    let fullSystemPrompt = this.systemPrompt;
    if (ragContext) {
      fullSystemPrompt += ragContext;
    }

    const messages: BaseMessage[] = [new SystemMessage(fullSystemPrompt)];

    // Add conversation history (limit to last 10 messages for context)
    if (chatMessageDto.conversationHistory && chatMessageDto.conversationHistory.length > 0) {
      const recentHistory = chatMessageDto.conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      }
    }

    // Add current user message
    messages.push(new HumanMessage(chatMessageDto.message));

    return messages;
  }

  async chat(chatMessageDto: ChatMessageDto): Promise<{ response: string; success: boolean }> {
    try {
      // Get relevant context from documents
      let ragContext = '';
      try {
        ragContext = await this.ragService.getRelevantContext(chatMessageDto.message, 3);
      } catch (ragError) {
        this.logger.warn('RAG context retrieval failed, continuing without:', ragError);
      }

      const messages = this.buildMessages(chatMessageDto, ragContext);
      const response = await this.chatModel.invoke(messages);

      return {
        response: response.content as string,
        success: true,
      };
    } catch (error) {
      this.logger.error('Error calling OpenAI API:', error);

      return {
        response: "Désolé, je rencontre actuellement des difficultés techniques. Veuillez réessayer dans quelques instants.",
        success: false,
      };
    }
  }

  async chatStream(chatMessageDto: ChatMessageDto, res: Response): Promise<void> {
    try {
      // Get relevant context from documents
      let ragContext = '';
      try {
        ragContext = await this.ragService.getRelevantContext(chatMessageDto.message, 3);
      } catch (ragError) {
        this.logger.warn('RAG context retrieval failed, continuing without:', ragError);
      }

      const messages = this.buildMessages(chatMessageDto, ragContext);

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const stream = await this.chatModel.stream(messages);

      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      this.logger.error('Error in streaming chat:', error);
      res.write(`data: ${JSON.stringify({ error: "Erreur lors de la génération de la réponse." })}\n\n`);
      res.end();
    }
  }
}
