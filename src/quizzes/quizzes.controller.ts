import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.createQuiz(createQuizDto);
  }

  @Get()
  findAllQuizzes() {
    return this.quizzesService.findAllQuizzes();
  }

  // Static routes MUST be before dynamic :id routes
  @Get('attempts/me')
  @UseGuards(JwtAuthGuard)
  getUserAttempts(@CurrentUser('id') userId: string) {
    return this.quizzesService.getUserAttempts(userId);
  }

  @Get('attempts')
  @UseGuards(JwtAuthGuard)
  getUserAttemptsAlias(@CurrentUser('id') userId: string) {
    return this.quizzesService.getUserAttempts(userId);
  }

  @Post('questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.quizzesService.createQuestion(createQuestionDto);
  }

  @Get('questions/:id')
  findQuestionById(@Param('id') id: string) {
    return this.quizzesService.findQuestionById(id);
  }

  @Patch('questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateQuestion(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.quizzesService.updateQuestion(id, updateQuestionDto);
  }

  @Delete('questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeQuestion(@Param('id') id: string) {
    return this.quizzesService.removeQuestion(id);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submitQuiz(
    @CurrentUser('id') userId: string,
    @Body() submitQuizDto: SubmitQuizDto,
  ) {
    return this.quizzesService.submitQuiz(userId, submitQuizDto);
  }

  // Dynamic :id routes MUST be after static routes
  @Get(':id')
  findQuizById(@Param('id') id: string) {
    return this.quizzesService.findQuizById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizzesService.updateQuiz(id, updateQuizDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeQuiz(@Param('id') id: string) {
    return this.quizzesService.removeQuiz(id);
  }

  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard)
  getUserQuizAttempts(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
  ) {
    return this.quizzesService.getUserQuizAttempts(userId, quizId);
  }

  @Get(':id/correction')
  @UseGuards(JwtAuthGuard)
  getQuizWithCorrections(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
  ) {
    return this.quizzesService.getQuizWithCorrections(userId, quizId);
  }
}
