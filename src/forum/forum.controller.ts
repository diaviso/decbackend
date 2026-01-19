import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ForumService } from './forum.service';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { UpdateForumCategoryDto } from './dto/update-forum-category.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { UpdateForumCommentDto } from './dto/update-forum-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createCategory(@Body() createForumCategoryDto: CreateForumCategoryDto) {
    return this.forumService.createCategory(createForumCategoryDto);
  }

  @Get('categories')
  findAllCategories() {
    return this.forumService.findAllCategories();
  }

  @Get('categories/:id')
  findCategoryById(@Param('id') id: string) {
    return this.forumService.findCategoryById(id);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateCategory(
    @Param('id') id: string,
    @Body() updateForumCategoryDto: UpdateForumCategoryDto,
  ) {
    return this.forumService.updateCategory(id, updateForumCategoryDto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeCategory(@Param('id') id: string) {
    return this.forumService.removeCategory(id);
  }

  @Post('topics')
  @UseGuards(JwtAuthGuard)
  createTopic(
    @CurrentUser('id') userId: string,
    @Body() createTopicDto: CreateTopicDto,
  ) {
    return this.forumService.createTopic(userId, createTopicDto);
  }

  @Get('topics')
  findAllTopics(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    return this.forumService.findAllTopics(categoryId, status);
  }

  @Get('topics/:id')
  findTopicById(@Param('id') id: string) {
    return this.forumService.findTopicById(id);
  }

  @Patch('topics/:id')
  @UseGuards(JwtAuthGuard)
  updateTopic(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() updateTopicDto: UpdateTopicDto,
  ) {
    return this.forumService.updateTopic(id, userId, userRole, updateTopicDto);
  }

  @Delete('topics/:id')
  @UseGuards(JwtAuthGuard)
  removeTopic(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.forumService.removeTopic(id, userId, userRole);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser('id') userId: string,
    @Body() createForumCommentDto: CreateForumCommentDto,
  ) {
    return this.forumService.createComment(userId, createForumCommentDto);
  }

  @Patch('comments/:id')
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() updateForumCommentDto: UpdateForumCommentDto,
  ) {
    return this.forumService.updateComment(id, userId, userRole, updateForumCommentDto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  removeComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.forumService.removeComment(id, userId, userRole);
  }

  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  likeComment(
    @Param('id') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.forumService.likeComment(commentId, userId);
  }
}
