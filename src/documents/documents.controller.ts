import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { DocumentsService, ProcessingResult } from './documents.service';
import { RagService, ChunkWithScore } from './rag.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SearchDocumentsDto } from './dto/search-documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly ragService: RagService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'documents'),
        filename: (req, file, callback) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (file.mimetype === 'application/pdf') {
          callback(null, true);
        } else {
          callback(new Error('Seuls les fichiers PDF sont acceptés'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    const document = await this.documentsService.uploadDocument(
      file,
      uploadDocumentDto,
    );

    // Process the document asynchronously
    this.documentsService.processDocument(document.id).catch((error) => {
      console.error(`Error processing document ${document.id}:`, error);
    });

    return {
      ...document,
      message:
        'Document uploadé avec succès. Le traitement est en cours en arrière-plan.',
    };
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.documentsService.getStats();
  }

  @Get('search')
  async search(@Query() searchDto: SearchDocumentsDto): Promise<ChunkWithScore[]> {
    const chunks = await this.ragService.searchSimilarChunks(
      searchDto.query,
      searchDto.limit,
    );
    return chunks;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  @Post(':id/reprocess')
  reprocess(@Param('id') id: string): Promise<ProcessingResult> {
    return this.documentsService.reprocessDocument(id);
  }
}
