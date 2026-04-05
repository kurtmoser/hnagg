import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

const IMAGES_DIR = '/app/images';

@Controller('api/images')
export class ImagesController {
  @Get(':filename')
  getImage(@Param('filename') filename: string, @Res() res: Response) {
    // Sanitize: only allow simple filenames (no path traversal)
    const sanitized = path.basename(filename);
    if (sanitized !== filename || filename.includes('\0')) {
      throw new NotFoundException();
    }

    const filepath = path.join(IMAGES_DIR, sanitized);

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException();
    }

    res.sendFile(filepath, { maxAge: '7d' });
  }
}
