import { Module, forwardRef } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [forwardRef(() => DocumentsModule)],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
