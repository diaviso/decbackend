import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { ThemesModule } from './themes/themes.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { BlogModule } from './blog/blog.module';
import { ForumModule } from './forum/forum.module';
import { UploadModule } from './upload/upload.module';
import { SeedModule } from './seed/seed.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', 'uploads'),
        serveRoot: '/uploads',
      },
      {
        rootPath: join(__dirname, '..', 'uploads', 'documents'),
        serveRoot: '/uploads/documents',
      },
    ),
    PrismaModule,
    SeedModule,
    MailModule,
    AuthModule,
    UsersModule,
    ThemesModule,
    QuizzesModule,
    BlogModule,
    ForumModule,
    UploadModule,
    DashboardModule,
    UsersModule,
    ChatbotModule,
    LeaderboardModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
