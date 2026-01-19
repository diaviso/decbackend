import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const slug = this.generateSlug(createCategoryDto.name);

    const existing = await this.prisma.blogCategory.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Category already exists');
    }

    return this.prisma.blogCategory.create({
      data: {
        name: createCategoryDto.name,
        slug,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.blogCategory.findMany({
      include: {
        _count: { select: { articles: true } },
      },
    });
  }

  async removeCategory(id: string) {
    const category = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.blogCategory.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  async createTag(createTagDto: CreateTagDto) {
    const slug = this.generateSlug(createTagDto.name);

    const existing = await this.prisma.tag.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Tag already exists');
    }

    return this.prisma.tag.create({
      data: {
        name: createTagDto.name,
        slug,
      },
    });
  }

  async findAllTags() {
    return this.prisma.tag.findMany({
      include: {
        _count: { select: { articles: true } },
      },
    });
  }

  async removeTag(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Tag deleted successfully' };
  }

  async createArticle(authorId: string, createArticleDto: CreateArticleDto) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id: createArticleDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const slug = this.generateSlug(createArticleDto.title) + '-' + Date.now();

    return this.prisma.article.create({
      data: {
        authorId,
        categoryId: createArticleDto.categoryId,
        title: createArticleDto.title,
        slug,
        content: createArticleDto.content,
        excerpt: createArticleDto.excerpt,
        published: createArticleDto.published ?? false,
        tags: createArticleDto.tagIds
          ? { connect: createArticleDto.tagIds.map(id => ({ id })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        tags: true,
      },
    });
  }

  async findAllArticles(published?: boolean) {
    return this.prisma.article.findMany({
      where: published !== undefined ? { published } : undefined,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        tags: true,
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findArticleBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        tags: true,
        comments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { likes: true } },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }

  async findArticleById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        tags: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }

  async updateArticle(id: string, userId: string, userRole: string, updateArticleDto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only edit your own articles');
    }

    const updateData: any = {
      title: updateArticleDto.title,
      content: updateArticleDto.content,
      excerpt: updateArticleDto.excerpt,
      published: updateArticleDto.published,
      categoryId: updateArticleDto.categoryId,
    };

    if (updateArticleDto.title) {
      updateData.slug = this.generateSlug(updateArticleDto.title) + '-' + Date.now();
    }

    if (updateArticleDto.tagIds) {
      updateData.tags = {
        set: updateArticleDto.tagIds.map(id => ({ id })),
      };
    }

    return this.prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        tags: true,
      },
    });
  }

  async removeArticle(id: string, userId: string, userRole: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own articles');
    }

    await this.prisma.article.delete({ where: { id } });
    return { message: 'Article deleted successfully' };
  }

  async likeArticle(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const existingLike = await this.prisma.articleLike.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });

    if (existingLike) {
      await this.prisma.articleLike.delete({
        where: { id: existingLike.id },
      });
      return { message: 'Like removed' };
    }

    await this.prisma.articleLike.create({
      data: { userId, articleId },
    });

    return { message: 'Article liked' };
  }

  async createComment(userId: string, createCommentDto: CreateCommentDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: createCommentDto.articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.prisma.comment.create({
      data: {
        userId,
        articleId: createCommentDto.articleId,
        content: createCommentDto.content,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateComment(id: string, userId: string, userRole: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content: updateCommentDto.content },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeComment(id: string, userId: string, userRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted successfully' };
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existingLike = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({
        where: { id: existingLike.id },
      });
      return { message: 'Like removed' };
    }

    await this.prisma.commentLike.create({
      data: { userId, commentId },
    });

    return { message: 'Comment liked' };
  }
}
