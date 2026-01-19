import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(createQuizDto: CreateQuizDto) {
    const theme = await this.prisma.theme.findUnique({
      where: { id: createQuizDto.themeId },
    });

    if (!theme) {
      throw new NotFoundException('Theme not found');
    }

    return this.prisma.quiz.create({
      data: {
        themeId: createQuizDto.themeId,
        title: createQuizDto.title,
        description: createQuizDto.description,
        difficulty: createQuizDto.difficulty,
        timeLimit: createQuizDto.timeLimit,
        passingScore: createQuizDto.passingScore,
        isFree: createQuizDto.isFree ?? false,
      },
    });
  }

  async findAllQuizzes() {
    return this.prisma.quiz.findMany({
      include: {
        theme: {
          select: { id: true, title: true },
        },
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async findQuizById(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        theme: true,
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async updateQuiz(id: string, updateQuizDto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return this.prisma.quiz.update({
      where: { id },
      data: updateQuizDto,
    });
  }

  async removeQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.prisma.quiz.delete({ where: { id } });

    return { message: 'Quiz deleted successfully' };
  }

  async createQuestion(createQuestionDto: CreateQuestionDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: createQuestionDto.quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (createQuestionDto.type === 'QCU') {
      const correctOptions = createQuestionDto.options.filter(o => o.isCorrect);
      if (correctOptions.length !== 1) {
        throw new BadRequestException('QCU must have exactly one correct answer');
      }
    }

    if (createQuestionDto.type === 'QCM') {
      const correctOptions = createQuestionDto.options.filter(o => o.isCorrect);
      if (correctOptions.length < 1) {
        throw new BadRequestException('QCM must have at least one correct answer');
      }
    }

    return this.prisma.question.create({
      data: {
        quizId: createQuestionDto.quizId,
        content: createQuestionDto.content,
        type: createQuestionDto.type,
        difficulty: createQuestionDto.difficulty,
        options: {
          create: createQuestionDto.options,
        },
      },
      include: {
        options: true,
      },
    });
  }

  async findQuestionById(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async updateQuestion(id: string, updateQuestionDto: UpdateQuestionDto) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (updateQuestionDto.options) {
      await this.prisma.option.deleteMany({ where: { questionId: id } });

      await this.prisma.option.createMany({
        data: updateQuestionDto.options.map(opt => ({
          questionId: id,
          content: opt.content || '',
          isCorrect: opt.isCorrect || false,
        })),
      });
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        content: updateQuestionDto.content,
        type: updateQuestionDto.type,
        difficulty: updateQuestionDto.difficulty,
      },
      include: {
        options: true,
      },
    });
  }

  async removeQuestion(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.prisma.question.delete({ where: { id } });

    return { message: 'Question deleted successfully' };
  }

  private calculateStars(score: number, passingScore: number, difficulty: string): number {
    const passed = score >= passingScore;

    if (!passed) {
      return 1; // Participation star for encouragement
    }

    // Base stars for passing
    let stars = 5;

    // Bonus for exceeding passing score: +1 star per 10% above passing score
    const bonusPercentage = score - passingScore;
    const bonusStars = Math.floor(bonusPercentage / 10);
    stars += bonusStars;

    // Difficulty multiplier
    let multiplier = 1;
    switch (difficulty) {
      case 'FACILE':
        multiplier = 1;
        break;
      case 'MOYEN':
        multiplier = 1.5;
        break;
      case 'DIFFICILE':
        multiplier = 2;
        break;
    }

    return Math.round(stars * multiplier);
  }

  async getUserQuizAttempts(userId: string, quizId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { completedAt: 'desc' },
    });

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: { passingScore: true },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const failedAttempts = attempts.filter(a => a.score < quiz.passingScore).length;
    const passedAttempts = attempts.filter(a => a.score >= quiz.passingScore).length;
    const hasPassed = passedAttempts > 0;
    const canRetry = failedAttempts < 3 && !hasPassed;
    const canViewCorrection = failedAttempts >= 3 && !hasPassed;

    return {
      attempts,
      totalAttempts: attempts.length,
      failedAttempts,
      passedAttempts,
      hasPassed,
      canRetry,
      canViewCorrection,
      remainingAttempts: hasPassed ? 0 : Math.max(0, 3 - failedAttempts),
    };
  }

  async getQuizWithCorrections(userId: string, quizId: string) {
    const attemptInfo = await this.getUserQuizAttempts(userId, quizId);

    if (!attemptInfo.canViewCorrection) {
      throw new BadRequestException(
        'Vous devez avoir échoué 3 fois pour voir la correction'
      );
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        theme: true,
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async submitQuiz(userId: string, submitQuizDto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: submitQuizDto.quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check if user can still attempt this quiz
    const attemptInfo = await this.getUserQuizAttempts(userId, submitQuizDto.quizId);

    if (attemptInfo.hasPassed) {
      throw new BadRequestException('Vous avez déjà réussi ce quiz');
    }

    if (!attemptInfo.canRetry) {
      throw new BadRequestException(
        'Vous avez atteint le nombre maximum de tentatives (3). Consultez la correction.'
      );
    }

    let totalScore = 0;
    const pointsPerQuestion = 100 / quiz.questions.length;

    for (const answer of submitQuizDto.answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const correctOptionIds = question.options
        .filter(o => o.isCorrect)
        .map(o => o.id);

      const isCorrect =
        correctOptionIds.length === answer.selectedOptionIds.length &&
        correctOptionIds.every(id => answer.selectedOptionIds.includes(id));

      if (isCorrect) {
        totalScore += pointsPerQuestion;
      }
    }

    const finalScore = Math.round(totalScore);
    const passed = finalScore >= quiz.passingScore;

    // Calculate stars earned
    const starsEarned = this.calculateStars(finalScore, quiz.passingScore, quiz.difficulty);

    // Create attempt and update user stars atomically
    const [attempt, updatedUser] = await this.prisma.$transaction([
      this.prisma.quizAttempt.create({
        data: {
          userId,
          quizId: submitQuizDto.quizId,
          score: finalScore,
          starsEarned,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          stars: { increment: starsEarned },
        },
        select: { stars: true },
      }),
    ]);

    // Get updated attempt info
    const newAttemptInfo = await this.getUserQuizAttempts(userId, submitQuizDto.quizId);

    // Check if theme is completed (all quizzes passed)
    let themeCompleted = false;
    let themeName = '';

    if (passed && quiz.themeId) {
      // Get all quizzes of this theme
      const themeQuizzes = await this.prisma.quiz.findMany({
        where: { themeId: quiz.themeId, isActive: true },
        select: { id: true, passingScore: true },
      });

      // Get theme name
      const theme = await this.prisma.theme.findUnique({
        where: { id: quiz.themeId },
        select: { title: true },
      });
      themeName = theme?.title || '';

      // Check if user has passed all quizzes of this theme
      const passedQuizIds = new Set<string>();

      for (const themeQuiz of themeQuizzes) {
        // Get best attempt for this quiz
        const bestAttempt = await this.prisma.quizAttempt.findFirst({
          where: { userId, quizId: themeQuiz.id },
          orderBy: { score: 'desc' },
        });

        if (bestAttempt && bestAttempt.score >= themeQuiz.passingScore) {
          passedQuizIds.add(themeQuiz.id);
        }
      }

      // If all quizzes are passed, theme is completed
      themeCompleted = passedQuizIds.size === themeQuizzes.length && themeQuizzes.length > 0;
    }

    return {
      attempt,
      score: finalScore,
      passed,
      passingScore: quiz.passingScore,
      starsEarned,
      totalStars: updatedUser.stars,
      remainingAttempts: newAttemptInfo.remainingAttempts,
      canViewCorrection: newAttemptInfo.canViewCorrection,
      themeCompleted,
      themeName,
    };
  }

  async getUserAttempts(userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            passingScore: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }
}
