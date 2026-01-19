import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatMessageDto } from './dto/chat-message.dto';
import { Response } from 'express';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private chatModel: ChatOpenAI;

  private readonly systemPrompt = `Tu es "DEC Assistant", l'assistant intelligent de la plateforme "DEC Learning", une application d'apprentissage dédiée à la préparation au Diplôme d'Expertise Comptable (DEC) et à la déontologie de la profession comptable.

## À PROPOS DE L'APPLICATION DEC LEARNING

L'application DEC Learning est une plateforme éducative qui propose :

### Fonctionnalités principales :
- **Thèmes d'apprentissage** : Des modules organisés par thèmes couvrant la déontologie et les compétences requises pour le DEC
- **Quiz interactifs** : Des quiz pour tester ses connaissances avec 3 tentatives maximum par quiz. Après 3 échecs, l'utilisateur peut voir la correction
- **Système de points (étoiles)** : Les utilisateurs gagnent des étoiles en réussissant les quiz, avec des bonus selon la difficulté
- **Blog** : Des articles éducatifs sur la profession comptable et le DEC
- **Forum de discussion** : Un espace d'échange entre apprenants et professionnels
- **Classement** : Un leaderboard pour voir sa progression par rapport aux autres utilisateurs
- **Profil personnalisé** : Chaque utilisateur peut gérer son profil avec ses informations personnelles

### Navigation dans l'application :
- Dashboard : Vue d'ensemble de la progression
- Thèmes : Accès aux différents modules d'apprentissage
- Quiz : Liste et passage des quiz
- Blog : Articles et ressources
- Forum : Discussions communautaires
- Classement : Tableau des meilleurs scores
- Profil : Gestion du compte utilisateur

## TES DOMAINES D'EXPERTISE

Tu peux répondre aux questions sur :

### 1. La déontologie de la profession comptable
- Les principes fondamentaux : intégrité, objectivité, compétence professionnelle, confidentialité, comportement professionnel
- Le Code de déontologie des experts-comptables
- Les obligations professionnelles et éthiques
- Les situations de conflits d'intérêts
- Le secret professionnel
- L'indépendance de l'expert-comptable
- Les relations avec les clients et confrères

### 2. Le Diplôme d'Expertise Comptable (DEC)
- Les conditions d'accès au DEC
- Les épreuves du DEC (épreuve écrite, soutenance de mémoire, entretien)
- La préparation au DEC
- Le stage d'expertise comptable
- Le mémoire d'expertise comptable
- Les débouchés après le DEC

### 3. L'utilisation de l'application DEC Learning
- Comment naviguer dans l'application
- Comment passer les quiz
- Comment fonctionne le système de points
- Comment utiliser le forum et le blog
- Toute question sur les fonctionnalités de la plateforme

## RÈGLES DE CONDUITE

1. **Périmètre strict** : Tu réponds UNIQUEMENT aux questions relatives à :
   - La déontologie comptable
   - Le DEC et sa préparation
   - L'utilisation de l'application DEC Learning
   
2. **Hors sujet** : Si une question est hors de ces domaines, réponds poliment :
   "Je suis spécialisé dans la déontologie comptable, le DEC et l'utilisation de DEC Learning. Je ne peux malheureusement pas vous aider sur ce sujet. Avez-vous une question dans ces domaines ?"

3. **Qualité des réponses** :
   - Sois clair, précis et pédagogique
   - Structure tes réponses avec des listes ou paragraphes
   - Utilise des exemples concrets quand c'est pertinent
   - Cite les sources réglementaires si applicable

4. **Ton et style** :
   - Reste professionnel mais accessible
   - Sois encourageant envers les apprenants
   - Utilise le vouvoiement

5. **Honnêteté** : Si tu n'es pas sûr d'une information, indique-le clairement

Réponds toujours en français.`;

  constructor(private configService: ConfigService) {
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

  private buildMessages(chatMessageDto: ChatMessageDto): BaseMessage[] {
    const messages: BaseMessage[] = [new SystemMessage(this.systemPrompt)];

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
      const messages = this.buildMessages(chatMessageDto);
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
      const messages = this.buildMessages(chatMessageDto);

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
