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
import { BlogService } from './blog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.blogService.createCategory(createCategoryDto);
  }

  @Get('categories')
  findAllCategories() {
    return this.blogService.findAllCategories();
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeCategory(@Param('id') id: string) {
    return this.blogService.removeCategory(id);
  }

  @Post('tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createTag(@Body() createTagDto: CreateTagDto) {
    return this.blogService.createTag(createTagDto);
  }

  @Get('tags')
  findAllTags() {
    return this.blogService.findAllTags();
  }

  @Delete('tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeTag(@Param('id') id: string) {
    return this.blogService.removeTag(id);
  }

  @Post('articles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createArticle(
    @CurrentUser('id') userId: string,
    @Body() createArticleDto: CreateArticleDto,
  ) {
    return this.blogService.createArticle(userId, createArticleDto);
  }

  @Get('articles')
  findAllArticles(@Query('published') published?: string) {
    const pub = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.blogService.findAllArticles(pub);
  }

  @Get('articles/slug/:slug')
  findArticleBySlug(@Param('slug') slug: string) {
    return this.blogService.findArticleBySlug(slug);
  }

  @Get('articles/:id')
  findArticleById(@Param('id') id: string) {
    return this.blogService.findArticleById(id);
  }

  @Patch('articles/:id')
  @UseGuards(JwtAuthGuard)
  updateArticle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.blogService.updateArticle(id, userId, userRole, updateArticleDto);
  }

  @Delete('articles/:id')
  @UseGuards(JwtAuthGuard)
  removeArticle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.blogService.removeArticle(id, userId, userRole);
  }

  @Post('articles/:id/like')
  @UseGuards(JwtAuthGuard)
  likeArticle(
    @Param('id') articleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.blogService.likeArticle(articleId, userId);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser('id') userId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.blogService.createComment(userId, createCommentDto);
  }

  @Patch('comments/:id')
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.blogService.updateComment(id, userId, userRole, updateCommentDto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  removeComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.blogService.removeComment(id, userId, userRole);
  }

  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  likeComment(
    @Param('id') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.blogService.likeComment(commentId, userId);
  }
}
