import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

export interface ChunkWithScore {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  score: number;
  documentTitle: string | null;
  documentFilename: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private openai: OpenAI;
  private readonly embeddingModel = 'text-embedding-3-small';
  private readonly embeddingDimensions = 1536;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.error('OPENAI_API_KEY is not configured');
    }
  }

  /**
   * Generate embedding for a text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not configured');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text.slice(0, 8000), // Limit input to avoid token limits
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI client not configured');
    }

    try {
      // Process in batches of 100 (OpenAI limit)
      const batchSize = 100;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize).map(t => t.slice(0, 8000));

        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: batch,
        });

        const embeddings = response.data.map(d => d.embedding);
        allEmbeddings.push(...embeddings);
      }

      return allEmbeddings;
    } catch (error) {
      this.logger.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Search for similar document chunks based on a query
   */
  async searchSimilarChunks(query: string, limit: number = 5): Promise<ChunkWithScore[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);

    // Get all chunks with embeddings (filter in code since Prisma doesn't support null JSON check)
    const chunks = await this.prisma.documentChunk.findMany({
      include: {
        document: {
          select: {
            title: true,
            filename: true,
          },
        },
      },
    });

    // Filter chunks that have embeddings and calculate similarity scores
    const chunksWithScores: ChunkWithScore[] = chunks
      .filter(chunk => chunk.embedding !== null)
      .map(chunk => {
        const embedding = chunk.embedding as number[];
        const score = this.cosineSimilarity(queryEmbedding, embedding);

        return {
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          score,
          documentTitle: chunk.document.title,
          documentFilename: chunk.document.filename,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return chunksWithScores;
  }

  /**
   * Get context from documents for RAG-augmented responses
   */
  async getRelevantContext(query: string, limit: number = 3): Promise<string> {
    const chunks = await this.searchSimilarChunks(query, limit);

    if (chunks.length === 0) {
      return '';
    }

    // Build context string with source attribution
    const contextParts = chunks
      .filter(chunk => chunk.score > 0.3) // Only include reasonably relevant chunks
      .map((chunk, index) => {
        const source = chunk.documentTitle || chunk.documentFilename;
        const page = chunk.pageNumber ? ` (page ${chunk.pageNumber})` : '';
        return `[Source ${index + 1}: ${source}${page}]\n${chunk.content}`;
      });

    if (contextParts.length === 0) {
      return '';
    }

    return `\n\n--- INFORMATIONS ISSUES DES DOCUMENTS DE RÉFÉRENCE ---\n\n${contextParts.join('\n\n---\n\n')}`;
  }

  /**
   * Store embeddings for document chunks
   */
  async storeChunkEmbeddings(documentId: string): Promise<void> {
    // Get all chunks for this document
    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });

    if (chunks.length === 0) {
      return;
    }

    // Generate embeddings for all chunks
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await this.generateEmbeddings(texts);

    // Update chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      await this.prisma.documentChunk.update({
        where: { id: chunks[i].id },
        data: { embedding: embeddings[i] },
      });
    }

    this.logger.log(`Stored embeddings for ${chunks.length} chunks of document ${documentId}`);
  }
}
