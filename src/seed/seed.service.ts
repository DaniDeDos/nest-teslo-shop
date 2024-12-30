import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { initialData } from 'data/seed-data';
import { User } from 'src/auth/entities/user.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async run() {
    await this.deleteTables();
    const adminUser = await this.insertUsers();
    await this.insertProducts(adminUser);

    return 'Seed executed successfully!';
  }

  private async deleteTables() {
    await this.productsService.deleteAllProducts();

    const query = this.userRepository.createQueryBuilder();
    await query.delete().where({}).execute();
  }

  private async insertUsers() {
    const seedUsers = initialData.users;

    const users: User[] = [];

    seedUsers.forEach((user) => {
      users.push(this.userRepository.create(user));
    });

    const userDB = await this.userRepository.save(seedUsers);

    return userDB[0];
  }

  private async insertProducts(user: User) {
    await this.productsService.deleteAllProducts();

    const products = initialData.products;
    const insertPromises = [];
    products.forEach((products) => {
      insertPromises.push(this.productsService.create(products, user));
    });
    await Promise.all(insertPromises);

    return true;
  }
}
