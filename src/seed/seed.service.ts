import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { initialData } from 'data/seed-data';

@Injectable()
export class SeedService {
  constructor(private readonly productsService: ProductsService) {}
  async run() {
    await this.insertProducts();

    return 'Seed executed successfully!';
  }

  private async insertProducts() {
    await this.productsService.deleteAllProducts();

    const products = initialData.products;
    const insertPromises = [];

    products.forEach((products) => {
      insertPromises.push(this.productsService.create(products));
    });

    await Promise.all(insertPromises);

    return true;
  }
}
