import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll() {}

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productService.getDetail(slug);
  }

  @Post()
  create() {}

  @Post('create-bulk')
  createBulk() {}

  @Put(':id')
  update() {}

  @Delete()
  delete() {}

  @Patch('hidden')
  hidden() {}
}
