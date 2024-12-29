import { join } from 'path';
import { existsSync } from 'fs';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class FilesService {
  getStaticUpload(nameImg: string) {
    const ruta = join(__dirname, '../../../static/uploads', nameImg);

    console.log(__dirname)
    if (!existsSync(ruta))
      throw new BadRequestException(`No product found with image ${nameImg}`);

    return ruta;
  }
}
