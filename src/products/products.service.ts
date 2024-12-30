import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';

import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

import { Product } from './entities/product.entity';
import { Image } from 'src/images/entities/image.entity';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Image)
    private readonly imgRepository: Repository<Image>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { img = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        img: img.map((img) => this.imgRepository.create({ url: img })),
        user,
      });

      await this.productRepository.save(product);

      return { ...product, img };
    } catch (error) {
      this.handleExeptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        img: true,
      },
    });

    return products.map((product) => ({
      ...product,
      img: product.img.map((img) => img.url),
    }));
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const query = this.productRepository.createQueryBuilder('p');
      product = await query
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('p.img', 'productImg')
        .getOne();
    }

    if (!product)
      throw new NotFoundException(`Product with id ${term} not found!`);

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { img, ...rest } = updateProductDto;

    const product = await this.productRepository.preload({
      id,
      ...rest,
    });
    if (!product)
      throw new NotFoundException(`Product with id: ${id} not found!`);

    // Create query runner
    const query = this.dataSource.createQueryRunner();
    await query.connect();
    await query.startTransaction();
    try {
      if (img) {
        await query.manager.delete(Image, { product: { id } });
        product.img = img.map((img) => this.imgRepository.create({ url: img }));
      }

      product.user = user;
      await query.manager.save(product);
      await query.commitTransaction();
      await query.release();

      return this.findOnePlain(id);
    } catch (error) {
      await query.rollbackTransaction();
      await query.release();

      this.handleExeptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async findOnePlain(term: string) {
    const { img, ...rest } = await this.findOne(term);

    return {
      ...rest,
      img: img.map((img) => img.url),
    };
  }

  private handleExeptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);

    this.logger.error(error);
    //console.log(error)
    throw new InternalServerErrorException(
      'Unexpected error, check server logs!',
    );
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleExeptions(error);
    }
  }
}
