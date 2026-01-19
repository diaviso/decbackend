import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@Injectable()
export class ThemesService {
  constructor(private prisma: PrismaService) {}

  async create(createThemeDto: CreateThemeDto) {
    const existingPosition = await this.prisma.theme.findUnique({
      where: { position: createThemeDto.position },
    });

    if (existingPosition) {
      throw new ConflictException('Position already taken');
    }

    return this.prisma.theme.create({
      data: createThemeDto,
    });
  }

  async findAll() {
    return this.prisma.theme.findMany({
      orderBy: { position: 'asc' },
      include: {
        quizzes: {
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            timeLimit: true,
            passingScore: true,
            isFree: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const theme = await this.prisma.theme.findUnique({
      where: { id },
      include: {
        quizzes: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!theme) {
      throw new NotFoundException('Theme not found');
    }

    return theme;
  }

  async update(id: string, updateThemeDto: UpdateThemeDto) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });

    if (!theme) {
      throw new NotFoundException('Theme not found');
    }

    if (updateThemeDto.position && updateThemeDto.position !== theme.position) {
      const existingPosition = await this.prisma.theme.findUnique({
        where: { position: updateThemeDto.position },
      });

      if (existingPosition) {
        throw new ConflictException('Position already taken');
      }
    }

    return this.prisma.theme.update({
      where: { id },
      data: updateThemeDto,
    });
  }

  async remove(id: string) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });

    if (!theme) {
      throw new NotFoundException('Theme not found');
    }

    await this.prisma.theme.delete({ where: { id } });

    return { message: 'Theme deleted successfully' };
  }
}
