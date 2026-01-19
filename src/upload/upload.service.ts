import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(__dirname, '..', '..', 'uploads');

  constructor() {
    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getFileUrl(file: Express.Multer.File): { url: string; filename: string } {
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    return {
      url: `${baseUrl}/uploads/${file.filename}`,
      filename: file.filename,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = join(this.uploadDir, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    unlinkSync(filePath);
  }

  getFilePath(filename: string): string {
    return join(this.uploadDir, filename);
  }
}
