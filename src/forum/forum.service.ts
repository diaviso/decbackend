import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { UpdateForumCategoryDto } from './dto/update-forum-category.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { UpdateForumCommentDto } from './dto/update-forum-comment.dto';

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async createCategory(createForumCategoryDto: CreateForumCategoryDto) {
    const slug = this.generateSlug(createForumCategoryDto.name);

    const existing = await this.prisma.forumCategory.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Category already exists');
    }

    return this.prisma.forumCategory.create({
      data: {
        name: createForumCategoryDto.name,
        slug,
        description: createForumCategoryDto.description,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.forumCategory.findMany({
      include: {
        _count: { select: { topics: true } },
      },
    });
  }

  async findCategoryById(id: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { topics: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(id: string, updateForumCategoryDto: UpdateForumCategoryDto) {
    const category = await this.prisma.forumCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const data: any = {};
    
    if (updateForumCategoryDto.name) {
      data.name = updateForumCategoryDto.name;
      data.slug = this.generateSlug(updateForumCategoryDto.name);
      
      // Check if new slug already exists
      const existing = await this.prisma.forumCategory.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    if (updateForumCategoryDto.description !== undefined) {
      data.description = updateForumCategoryDto.description;
    }

    return this.prisma.forumCategory.update({
      where: { id },
      data,
    });
  }

  async removeCategory(id: string) {
    const category = await this.prisma.forumCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.forumCategory.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  async createTopic(authorId: string, createTopicDto: CreateTopicDto) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { id: createTopicDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.forumTopic.create({
      data: {
        authorId,
        categoryId: createTopicDto.categoryId,
        title: createTopicDto.title,
        content: createTopicDto.content,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
      },
    });
  }

  async findAllTopics(categoryId?: string, status?: string) {
    return this.prisma.forumTopic.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(status && { status: status as any }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTopicById(id: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        comments: {
          where: { parentCommentId: null },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            replies: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { likes: true } },
              },
            },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return topic;
  }

  async updateTopic(id: string, userId: string, userRole: string, updateTopicDto: UpdateTopicDto) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only edit your own topics');
    }

    return this.prisma.forumTopic.update({
      where: { id },
      data: updateTopicDto,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: true,
      },
    });
  }

  async removeTopic(id: string, userId: string, userRole: string) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own topics');
    }

    await this.prisma.forumTopic.delete({ where: { id } });
    return { message: 'Topic deleted successfully' };
  }

  async createComment(userId: string, createForumCommentDto: CreateForumCommentDto) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: createForumCommentDto.topicId },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.status === 'FERME') {
      throw new ForbiddenException('This topic is closed');
    }

    if (createForumCommentDto.parentCommentId) {
      const parentComment = await this.prisma.forumComment.findUnique({
        where: { id: createForumCommentDto.parentCommentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return this.prisma.forumComment.create({
      data: {
        userId,
        topicId: createForumCommentDto.topicId,
        content: createForumCommentDto.content,
        parentCommentId: createForumCommentDto.parentCommentId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateComment(id: string, userId: string, userRole: string, updateForumCommentDto: UpdateForumCommentDto) {
    const comment = await this.prisma.forumComment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.forumComment.update({
      where: { id },
      data: { content: updateForumCommentDto.content },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeComment(id: string, userId: string, userRole: string) {
    const comment = await this.prisma.forumComment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.forumComment.delete({ where: { id } });
    return { message: 'Comment deleted successfully' };
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.prisma.forumComment.findUnique({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existingLike = await this.prisma.forumCommentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existingLike) {
      await this.prisma.forumCommentLike.delete({
        where: { id: existingLike.id },
      });
      return { message: 'Like removed' };
    }

    await this.prisma.forumCommentLike.create({
      data: { userId, commentId },
    });

    return { message: 'Comment liked' };
  }
}
