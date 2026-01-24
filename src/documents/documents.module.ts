import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { RagService } from './rag.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, RagService],
  exports: [DocumentsService, RagService],
})
export class DocumentsModule {}
