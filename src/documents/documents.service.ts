import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from './rag.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface ProcessingResult {
  success: boolean;
  chunksCreated: number;
  totalPages?: number;
  error?: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly CHUNK_SIZE = 1000; // Characters per chunk
  private readonly CHUNK_OVERLAP = 200; // Overlap between chunks

  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
  ) {}

  /**
   * Upload and save a document metadata
   */
  async uploadDocument(
    file: Express.Multer.File,
    uploadDocumentDto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Seuls les fichiers PDF sont acceptés');
    }

    const document = await this.prisma.document.create({
      data: {
        filename: file.originalname,
        filepath: file.path,
        title: uploadDocumentDto.title || null,
        description: uploadDocumentDto.description || null,
        fileSize: file.size,
        mimeType: file.mimetype,
        isProcessed: false,
      },
    });

    this.logger.log(`Document uploaded: ${document.id} - ${file.originalname}`);

    return document;
  }

  /**
   * Process a PDF document: extract text and create chunks
   */
  async processDocument(documentId: string): Promise<ProcessingResult> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    if (!fs.existsSync(document.filepath)) {
      throw new NotFoundException('Fichier non trouvé sur le disque');
    }

    try {
      // Read PDF file and parse it using pdf-parse
      const dataBuffer = fs.readFileSync(document.filepath);
      const pdfData = await pdfParse(dataBuffer);

      const totalPages = pdfData.numpages || 0;
      const text = pdfData.text || '';

      // Clean and normalize text
      const cleanedText = this.cleanText(text);

      // Split into chunks
      const chunks = this.splitIntoChunks(cleanedText);

      // Delete existing chunks for this document
      await this.prisma.documentChunk.deleteMany({
        where: { documentId },
      });

      // Create new chunks
      for (let i = 0; i < chunks.length; i++) {
        await this.prisma.documentChunk.create({
          data: {
            documentId,
            content: chunks[i].content,
            chunkIndex: i,
            pageNumber: chunks[i].pageNumber,
            metadata: { wordCount: chunks[i].content.split(/\s+/).length },
          },
        });
      }

      // Generate and store embeddings
      await this.ragService.storeChunkEmbeddings(documentId);

      // Update document as processed
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          isProcessed: true,
          processedAt: new Date(),
          totalPages,
          totalChunks: chunks.length,
        },
      });

      this.logger.log(
        `Document processed: ${documentId} - ${chunks.length} chunks created`,
      );

      return {
        success: true,
        chunksCreated: chunks.length,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Error processing document ${documentId}:`, error);
      return {
        success: false,
        chunksCreated: 0,
        error: error.message,
      };
    }
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/^\s+|\s+$/gm, '')
      .trim();
  }

  /**
   * Split text into overlapping chunks
   */
  private splitIntoChunks(
    text: string,
  ): { content: string; pageNumber: number | null }[] {
    const chunks: { content: string; pageNumber: number | null }[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = '';
    let chunkStart = 0;

    for (const sentence of sentences) {
      if (
        currentChunk.length + sentence.length > this.CHUNK_SIZE &&
        currentChunk.length > 0
      ) {
        chunks.push({
          content: currentChunk.trim(),
          pageNumber: null, // Page detection would require more complex parsing
        });

        // Create overlap by keeping the last part of the chunk
        const words = currentChunk.split(/\s+/);
        const overlapWordCount = Math.floor(
          (this.CHUNK_OVERLAP / this.CHUNK_SIZE) * words.length,
        );
        currentChunk = words.slice(-overlapWordCount).join(' ') + ' ';
      }

      currentChunk += sentence + ' ';
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        pageNumber: null,
      });
    }

    return chunks;
  }

  /**
   * Get all documents
   */
  async findAll() {
    return this.prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        title: true,
        description: true,
        fileSize: true,
        mimeType: true,
        totalPages: true,
        totalChunks: true,
        isProcessed: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get a single document by ID
   */
  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            pageNumber: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    return document;
  }

  /**
   * Update document metadata
   */
  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    return this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
    });
  }

  /**
   * Delete a document and its chunks
   */
  async remove(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    // Delete the file from disk
    if (fs.existsSync(document.filepath)) {
      fs.unlinkSync(document.filepath);
    }

    // Delete from database (cascades to chunks)
    await this.prisma.document.delete({
      where: { id },
    });

    this.logger.log(`Document deleted: ${id}`);

    return { message: 'Document supprimé avec succès' };
  }

  /**
   * Reprocess a document (useful if processing failed or embeddings need update)
   */
  async reprocessDocument(id: string): Promise<ProcessingResult> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    return this.processDocument(id);
  }

  /**
   * Get document statistics
   */
  async getStats() {
    const [totalDocuments, processedDocuments, totalChunks] = await Promise.all(
      [
        this.prisma.document.count(),
        this.prisma.document.count({ where: { isProcessed: true } }),
        this.prisma.documentChunk.count(),
      ],
    );

    const documents = await this.prisma.document.findMany({
      select: { fileSize: true },
    });

    const totalSize = documents.reduce((acc, doc) => acc + doc.fileSize, 0);

    return {
      totalDocuments,
      processedDocuments,
      pendingDocuments: totalDocuments - processedDocuments,
      totalChunks,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  }
}
