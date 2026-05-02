import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

const FAVICONS_DIR = '/app/favicons';

@Controller('api/favicons')
export class FaviconsController {
  @Get(':filename')
  getFavicon(@Param('filename') filename: string, @Res() res: Response) {
    const sanitized = path.basename(filename);
    if (sanitized !== filename || filename.includes('\0')) {
      throw new NotFoundException();
    }

    const filepath = path.join(FAVICONS_DIR, sanitized);

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException();
    }

    res.sendFile(filepath, { maxAge: '7d' });
  }
}
