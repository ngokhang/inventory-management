import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductCategoryController } from './category/product-category.controller';
import { ProductCategoryService } from './category/product-category.service';

@Module({
  controllers: [ProductController, ProductCategoryController],
  providers: [ProductService, ProductCategoryService],
})
export class ProductModule {}
